import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { TitularSelectorDialogComponent } from '../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import {
  ESTADO_PAGO_LABELS,
  EstadoAplicacion,
  FORMA_PAGO_LABELS,
  FilaAbono,
  TIPO_DOC_PAGO_LABELS,
  TipoDocPago,
} from '../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { ExportService } from '../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import {
  AsientoRelacionado,
  DocumentoEstadoCuenta,
  RESUMEN_VACIO,
  ResumenEstadoCuenta,
  RolTitular,
  TIPOS_DOCUMENTO,
  TIPO_DOCUMENTO_LABELS,
  TipoDocumentoEstadoCuenta,
} from '../../model/estado-cuenta-titular';
import { Titular } from '../../model/titular';
import { EstadoCuentaTitularService } from '../../service/estado-cuenta-titular.service';

/** Filtro de estado de pago; agrupa varios estadoPago en una sola opción. */
type FiltroEstado = 'TODOS' | 'PENDIENTE' | 'PARCIAL' | 'PAGADA';

/**
 * Estado de cuenta de un titular, por rol. Reúne en una pantalla los
 * documentos emitidos y recibidos, su saldo, los abonos que los cancelaron,
 * los asientos contables que generaron y el saldo a favor por anticipos.
 *
 * Toda la consulta al backend ocurre una vez por titular/rol; los filtros son
 * locales y por eso responden al instante.
 */
@Component({
  selector: 'app-estado-cuenta-titular',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatButtonToggleModule],
  templateUrl: './estado-cuenta-titular.component.html',
  styleUrl: './estado-cuenta-titular.component.scss',
})
export class EstadoCuentaTitularComponent implements OnInit {
  private estadoCuentaS = inject(EstadoCuentaTitularService);
  private funcionesDatos = inject(FuncionesDatosService);
  private exportS = inject(ExportService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  readonly RolTitular = RolTitular;
  readonly tiposDocumento = TIPOS_DOCUMENTO;

  // ─── Titular y rol ───────────────────────────────────────
  titular = signal<Titular | null>(null);
  rol = signal<RolTitular>(RolTitular.CLIENTE);

  // ─── Estado de la consulta ───────────────────────────────
  cargando = signal(false);
  consultado = signal(false);
  advertencias = signal<string[]>([]);
  private documentos = signal<DocumentoEstadoCuenta[]>([]);

  // ─── Filtros (signals para que la grilla reaccione sola) ──
  fDesde = signal<Date | null>(null);
  fHasta = signal<Date | null>(null);
  fTipos = signal<TipoDocumentoEstadoCuenta[]>([]);
  fEstado = signal<FiltroEstado>('TODOS');
  fTexto = signal('');
  fSoloConSaldo = signal(false);
  fMontoDesde = signal<string>('');
  fMontoHasta = signal<string>('');

  // ─── Grilla ──────────────────────────────────────────────
  expandido = signal<string | null>(null);
  readonly columnas = [
    'expandir', 'tipo', 'numero', 'fecha', 'origen',
    'total', 'aplicado', 'saldo', 'estado', 'asiento',
  ];
  readonly columnasAbono = ['fecha', 'tipo', 'documento', 'monto', 'estado', 'asiento'];

  /**
   * Documentos que pasan todos los filtros. Los anticipos se listan aparte
   * (son saldo a favor, no deuda) pero comparten los filtros de fecha y texto.
   */
  readonly documentosFiltrados = computed(() =>
    this.documentos().filter((d) => this.pasaFiltros(d))
  );

  /** Deuda: todo menos anticipos. Es lo que va en la grilla principal. */
  readonly documentosDeuda = computed(() =>
    this.documentosFiltrados().filter((d) => d.tipo !== TipoDocumentoEstadoCuenta.ANTICIPO)
  );

  /** Saldo a favor: anticipos con saldo o ya consumidos, según el filtro. */
  readonly anticipos = computed(() =>
    this.documentosFiltrados().filter((d) => d.tipo === TipoDocumentoEstadoCuenta.ANTICIPO)
  );

  readonly resumen = computed<ResumenEstadoCuenta>(() => {
    const filas = this.documentosFiltrados();
    if (!filas.length) return { ...RESUMEN_VACIO };

    const resumen: ResumenEstadoCuenta = { ...RESUMEN_VACIO, totalDocumentos: filas.length };

    for (const d of filas) {
      switch (d.tipo) {
        case TipoDocumentoEstadoCuenta.FACTURA:
          resumen.totalFacturado += d.total;
          resumen.totalAbonado += Number(d.totalAplicado ?? 0);
          resumen.saldoPendiente += Number(d.saldoPendiente ?? 0);
          if (Number(d.saldoPendiente ?? 0) > 0) resumen.documentosPendientes++;
          break;
        case TipoDocumentoEstadoCuenta.NOTA_CREDITO:
          resumen.totalNotasCredito += d.total;
          break;
        case TipoDocumentoEstadoCuenta.NOTA_DEBITO:
          resumen.totalNotasDebito += d.total;
          break;
        case TipoDocumentoEstadoCuenta.RETENCION:
          resumen.totalRetenciones += d.total;
          break;
        case TipoDocumentoEstadoCuenta.ANTICIPO:
          resumen.saldoAnticipos += Number(d.saldoPendiente ?? 0);
          break;
      }
    }

    return resumen;
  });

  /** Cuántos filtros hay puestos; alimenta el badge de "filtros activos". */
  readonly filtrosActivos = computed(() => {
    let total = 0;
    if (this.fDesde()) total++;
    if (this.fHasta()) total++;
    if (this.fTipos().length) total++;
    if (this.fEstado() !== 'TODOS') total++;
    if (this.fTexto().trim()) total++;
    if (this.fSoloConSaldo()) total++;
    if (this.fMontoDesde().trim() || this.fMontoHasta().trim()) total++;
    return total;
  });

  ngOnInit(): void {
    // Solo se preselecciona el rol: el titular lo elige el usuario, porque la
    // cabecera necesita sus datos completos y no hay un getById por código.
    const rolParam = this.route.snapshot.queryParamMap.get('rol');
    if (rolParam) {
      this.rol.set(Number(rolParam) === RolTitular.PROVEEDOR ? RolTitular.PROVEEDOR : RolTitular.CLIENTE);
    }
  }

  // ═══ TITULAR Y CONSULTA ═════════════════════════════════

  get nombreTitular(): string {
    const t = this.titular();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  get etiquetaRol(): string {
    return this.rol() === RolTitular.CLIENTE ? 'Cliente' : 'Proveedor';
  }

  /** Como cliente se cobra; como proveedor se paga. Cambia toda la lectura. */
  get etiquetaSaldo(): string {
    return this.rol() === RolTitular.CLIENTE ? 'Saldo por cobrar' : 'Saldo por pagar';
  }

  buscarTitular(): void {
    const rol = this.rol();
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: {
        rolCodigo: rol,
        rolNombre: rol === RolTitular.CLIENTE ? 'CLIENTE' : 'PROVEEDOR',
        titulo: rol === RolTitular.CLIENTE ? 'Buscar Cliente' : 'Buscar Proveedor',
      },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (!titular) return;
      this.titular.set(titular);
      this.consultar();
    });
  }

  /** Al cambiar de rol el titular puede no tenerlo: se limpia la consulta. */
  onCambioRol(): void {
    this.documentos.set([]);
    this.consultado.set(false);
    this.advertencias.set([]);
    this.expandido.set(null);
    if (this.titular()) {
      this.consultar();
    }
  }

  consultar(): void {
    const titular = this.titular();
    if (!titular?.codigo) {
      this.snackBar.open('Seleccione un titular para consultar su estado de cuenta', 'Cerrar', { duration: 3500 });
      return;
    }

    this.cargando.set(true);
    this.advertencias.set([]);
    this.expandido.set(null);

    this.estadoCuentaS.consultar(titular.codigo, this.rol()).subscribe({
      next: (resultado) => {
        this.documentos.set(resultado.documentos);
        this.advertencias.set(resultado.advertencias);
        this.cargando.set(false);
        this.consultado.set(true);
      },
      error: () => {
        this.documentos.set([]);
        this.cargando.set(false);
        this.consultado.set(true);
        this.snackBar.open('No se pudo consultar el estado de cuenta', 'Cerrar', { duration: 5000 });
      },
    });
  }

  // ═══ FILTROS ════════════════════════════════════════════

  private pasaFiltros(d: DocumentoEstadoCuenta): boolean {
    const tipos = this.fTipos();
    if (tipos.length && !tipos.includes(d.tipo)) return false;

    const texto = this.fTexto().trim().toLowerCase();
    if (texto) {
      const buscable = `${d.numero} ${d.observacion ?? ''} ${d.asiento?.numeroAlterno ?? ''}`.toLowerCase();
      if (!buscable.includes(texto)) return false;
    }

    const tiempo = this.estadoCuentaS.aTiempo(d.fecha);
    const desde = this.fDesde();
    const hasta = this.fHasta();
    if (desde && tiempo && tiempo < this.inicioDelDia(desde)) return false;
    if (hasta && tiempo && tiempo > this.finDelDia(hasta)) return false;

    const montoDesde = parseFloat(this.fMontoDesde().replace(',', '.'));
    const montoHasta = parseFloat(this.fMontoHasta().replace(',', '.'));
    if (Number.isFinite(montoDesde) && d.total < montoDesde) return false;
    if (Number.isFinite(montoHasta) && d.total > montoHasta) return false;

    if (this.fSoloConSaldo() && Number(d.saldoPendiente ?? 0) <= 0) return false;

    // El estado de pago solo existe en facturas y anticipos; el resto de
    // documentos se aplica entero, así que un filtro de estado los excluye.
    const estado = this.fEstado();
    if (estado !== 'TODOS') {
      const saldo = Number(d.saldoPendiente ?? 0);
      const aplicado = Number(d.totalAplicado ?? 0);
      if (d.saldoPendiente == null) return false;
      if (estado === 'PENDIENTE' && !(aplicado <= 0 && saldo > 0)) return false;
      if (estado === 'PARCIAL' && !(aplicado > 0 && saldo > 0)) return false;
      if (estado === 'PAGADA' && saldo > 0.005) return false;
    }

    return true;
  }

  alternarTipo(tipo: TipoDocumentoEstadoCuenta): void {
    const actuales = this.fTipos();
    this.fTipos.set(
      actuales.includes(tipo) ? actuales.filter((t) => t !== tipo) : [...actuales, tipo]
    );
  }

  tipoActivo(tipo: TipoDocumentoEstadoCuenta): boolean {
    return this.fTipos().includes(tipo);
  }

  limpiarFiltros(): void {
    this.fDesde.set(null);
    this.fHasta.set(null);
    this.fTipos.set([]);
    this.fEstado.set('TODOS');
    this.fTexto.set('');
    this.fSoloConSaldo.set(false);
    this.fMontoDesde.set('');
    this.fMontoHasta.set('');
  }

  /** Atajos de periodo: lo que el usuario pide el 90% de las veces. */
  aplicarPeriodo(periodo: 'MES' | 'TRIMESTRE' | 'ANIO' | 'TODO'): void {
    const hoy = new Date();
    if (periodo === 'TODO') {
      this.fDesde.set(null);
      this.fHasta.set(null);
      return;
    }
    const desde = new Date(hoy);
    if (periodo === 'MES') desde.setMonth(hoy.getMonth() - 1);
    if (periodo === 'TRIMESTRE') desde.setMonth(hoy.getMonth() - 3);
    if (periodo === 'ANIO') desde.setFullYear(hoy.getFullYear() - 1);
    this.fDesde.set(desde);
    this.fHasta.set(hoy);
  }

  private inicioDelDia(fecha: Date): number {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private finDelDia(fecha: Date): number {
    const d = new Date(fecha);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }

  // ═══ FILA EXPANDIDA: ABONOS Y ASIENTOS ══════════════════

  alternarExpansion(doc: DocumentoEstadoCuenta): void {
    if (this.expandido() === doc.clave) {
      this.expandido.set(null);
      return;
    }
    this.expandido.set(doc.clave);

    // Los abonos solo existen para facturas y se piden una sola vez.
    if (doc.tipo !== TipoDocumentoEstadoCuenta.FACTURA || doc.abonosCargados || doc.cargandoAbonos) {
      return;
    }

    doc.cargandoAbonos = true;
    this.estadoCuentaS.abonosDeFactura(doc.id, this.rol()).subscribe((abonos) => {
      doc.abonos = abonos;
      doc.abonosCargados = true;
      doc.cargandoAbonos = false;
      // La referencia cambia para que la grilla repinte los totales derivados.
      this.documentos.set([...this.documentos()]);
    });
  }

  estaExpandido(doc: DocumentoEstadoCuenta): boolean {
    return this.expandido() === doc.clave;
  }

  /**
   * Asientos que tocaron el documento: el propio de su contabilización más
   * el de cada abono que lo fue cancelando.
   */
  asientosDe(doc: DocumentoEstadoCuenta): AsientoRelacionado[] {
    const asientos: AsientoRelacionado[] = [];
    if (doc.asiento) asientos.push(doc.asiento);

    (doc.abonos ?? []).forEach((abono) => {
      if (!abono.asiento?.codigo) return;
      asientos.push({
        codigo: abono.asiento.codigo,
        numeroAlterno: abono.asiento.numeroAlterno,
        fecha: abono.fechaAplicacion,
        origen: `Abono · ${this.etiquetaTipoAbono(abono)}`,
        observaciones: abono.observacion ?? null,
      });
    });

    // Un mismo asiento puede aparecer por el documento y por un abono.
    const vistos = new Set<number>();
    return asientos.filter((a) => (vistos.has(a.codigo) ? false : vistos.add(a.codigo)));
  }

  etiquetaTipoAbono(abono: FilaAbono): string {
    if (abono.tipoDocPago === TipoDocPago.PAGO_DIRECTO && abono.formaPago != null) {
      const forma = FORMA_PAGO_LABELS[abono.formaPago];
      if (forma) return forma;
    }
    return TIPO_DOC_PAGO_LABELS[abono.tipoDocPago]?.texto ?? `Tipo ${abono.tipoDocPago}`;
  }

  documentoDeAbono(abono: FilaAbono): string {
    const doc = abono.notaCredito ?? abono.retencionV2 ?? abono.retencion ?? abono.notaDebito ?? abono.anticipo;
    if (doc) return doc.numero ?? doc.numeroDoc ?? `N° ${doc.id ?? doc.codigo ?? ''}`;
    const partes = [abono.referencia, abono.banco].filter((p) => !!p);
    return partes.length ? partes.join(' — ') : '—';
  }

  abonoReversado(abono: FilaAbono): boolean {
    return abono.estado === EstadoAplicacion.REVERSADO;
  }

  // ═══ PRESENTACIÓN ═══════════════════════════════════════

  etiquetaTipo(tipo: TipoDocumentoEstadoCuenta): string {
    return TIPO_DOCUMENTO_LABELS[tipo]?.etiqueta ?? tipo;
  }

  iconoTipo(tipo: TipoDocumentoEstadoCuenta): string {
    return TIPO_DOCUMENTO_LABELS[tipo]?.icono ?? 'description';
  }

  claseTipo(tipo: TipoDocumentoEstadoCuenta): string {
    return `chip-${tipo.toLowerCase().replace('_', '-')}`;
  }

  /** Badge de estado de pago; los documentos sin saldo propio no llevan. */
  etiquetaEstadoPago(doc: DocumentoEstadoCuenta): { texto: string; clase: string } | null {
    if (doc.saldoPendiente == null) return null;

    if (doc.tipo === TipoDocumentoEstadoCuenta.ANTICIPO) {
      if (doc.saldoPendiente > 0.005) {
        return { texto: 'Disponible', clase: 'badge-pagada' };
      }
      return { texto: 'Consumido', clase: 'badge-neutro' };
    }

    const estado = doc.estadoPago
      ?? (doc.saldoPendiente <= 0.005 ? 3 : Number(doc.totalAplicado ?? 0) > 0 ? 2 : 1);
    return ESTADO_PAGO_LABELS[estado] ?? { texto: '—', clase: 'badge-neutro' };
  }

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearMonto(monto: number | null | undefined): string {
    return (Number(monto) || 0).toLocaleString('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ═══ EXPORTACIÓN ════════════════════════════════════════

  private filasExportables(): Record<string, string>[] {
    return this.documentosFiltrados().map((d) => ({
      tipo: this.etiquetaTipo(d.tipo),
      origen: d.origen === 'EMITIDO' ? 'Emitido' : 'Recibido',
      numero: d.numero,
      fecha: this.formatearFecha(d.fecha),
      total: this.formatearMonto(d.total),
      aplicado: d.totalAplicado != null ? this.formatearMonto(d.totalAplicado) : '',
      saldo: d.saldoPendiente != null ? this.formatearMonto(d.saldoPendiente) : '',
      estado: this.etiquetaEstadoPago(d)?.texto ?? '',
      asiento: d.asiento?.numeroAlterno ?? '',
    }));
  }

  private readonly cabecerasExport = [
    'Tipo', 'Origen', 'Número', 'Fecha', 'Total', 'Aplicado', 'Saldo', 'Estado', 'Asiento',
  ];

  private readonly clavesExport = [
    'tipo', 'origen', 'numero', 'fecha', 'total', 'aplicado', 'saldo', 'estado', 'asiento',
  ];

  private nombreArchivo(): string {
    const titular = (this.nombreTitular || 'titular').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
    return `EstadoCuenta_${titular}_${this.etiquetaRol}`;
  }

  exportarCSV(): void {
    if (!this.hayDatosParaExportar()) return;
    this.exportS.exportToCSV(
      this.filasExportables(),
      this.nombreArchivo(),
      this.cabecerasExport,
      this.clavesExport
    );
    this.snackBar.open('Exportación CSV iniciada', 'Cerrar', { duration: 2500 });
  }

  exportarPDF(): void {
    if (!this.hayDatosParaExportar()) return;
    const r = this.resumen();
    const titulo = `Estado de Cuenta · ${this.nombreTitular} (${this.etiquetaRol})`
      + ` · ${this.etiquetaSaldo}: ${this.formatearMonto(r.saldoPendiente)}`;

    this.exportS.exportToPDF(
      this.filasExportables(),
      this.nombreArchivo(),
      titulo,
      this.cabecerasExport,
      this.clavesExport
    );
    this.snackBar.open('Generando PDF...', 'Cerrar', { duration: 2500 });
  }

  private hayDatosParaExportar(): boolean {
    if (this.documentosFiltrados().length) return true;
    this.snackBar.open('No hay documentos para exportar con los filtros actuales', 'Cerrar', { duration: 3500 });
    return false;
  }
}
