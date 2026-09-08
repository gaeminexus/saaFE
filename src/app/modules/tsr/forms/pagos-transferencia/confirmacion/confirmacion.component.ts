import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { ESTADO_PAGO_PROGRAMADO_LABELS, EstadoPagoProgramado } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { etiquetaOrigenPagoExterno } from '../../../../cxp/model/origen-pago-externo';
import {
  ConfirmarManualResponse,
  ORIGEN_PAGO_LABELS,
  OrigenPago,
  PagoProgramado,
  RespuestaBancoResponse,
} from '../../../../cxp/model/pago-programado';
import { PagoProgramadoService } from '../../../../cxp/service/pago-programado.service';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';

/**
 * T3 del circuito de pagos por transferencia
 * (docs/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md §3.2): junta las
 * antiguas pestañas "3. Cargar Respuesta del Banco" y "4. Confirmación
 * Manual" de PagosTransferenciaComponent (cxp) — son dos caminos para el
 * mismo hecho, que el banco pagó o no pagó.
 *
 * La confirmación manual va PRIMERO y más grande a propósito: el lector del
 * archivo de respuesta sigue siendo provisional (espera un Excel de 4
 * columnas armado a mano, no el formato nativo del banco) y la confirmación
 * manual es el camino principal, no un parche temporal — confirmado con el
 * usuario el 2026-08-28.
 */
@Component({
  selector: 'app-confirmacion-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './confirmacion.component.html',
  styleUrl: './confirmacion.component.scss',
})
export class ConfirmacionComponent implements OnInit, AfterViewChecked {
  private pagoS = inject(PagoProgramadoService);
  private cuentaBancariaS = inject(CuentaBancariaService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  // ─── Filtros (docs/pagos/API-BANDEJA-CONFIRMACION-FILTROS.md §3.1) — todos al servidor ───
  readonly origenOptions = (Object.entries(ORIGEN_PAGO_LABELS) as [OrigenPago, string][]).map(
    ([codigo, texto]) => ({ codigo, texto }),
  );
  cuentasBancarias = signal<CuentaBancaria[]>([]);
  filtroCuenta = signal<CuentaBancaria | null>(null);
  /** Vacío = todos los orígenes, mismo criterio que la bandeja de aprobación. */
  filtroOrigenes = signal<OrigenPago[]>([]);
  filtroDesde = signal<string>('');
  filtroHasta = signal<string>('');
  filtroTexto = signal<string>('');

  // ─── Confirmación manual (camino principal) ────────────
  pagosPorConfirmar = signal<PagoProgramado[]>([]);
  confSeleccionados = new Set<number>();
  /** Referencia bancaria por pago — cada pago confirmado puede traer una distinta. */
  referenciasPorPago = signal<Record<number, string>>({});
  confFecha: Date | null = new Date();
  confObservacion = '';
  cargandoPorConfirmar = signal(false);
  confirmandoManual = signal(false);
  confError = signal('');
  confResultado = signal<ConfirmarManualResponse | null>(null);
  readonly columnasConfirmacion = ['check', 'proveedor', 'factura', 'valor', 'fechaProgramada', 'estado', 'referencia'];

  readonly dataSourceConf = new MatTableDataSource<PagoProgramado>([]);
  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChildren('refInput') refInputs?: QueryList<ElementRef<HTMLInputElement>>;

  /** Id del pago que se acaba de marcar — se enfoca su campo de referencia apenas exista en el DOM. */
  private pendienteFoco: number | null = null;

  // ─── Fecha del pago: datepicker + tipeo manual dd/mm/aaaa (mismo patrón que mayor-analitico-v2) ───
  @ViewChild('confFechaInput', { read: ElementRef }) confFechaInputRef!: ElementRef<HTMLInputElement>;
  private _rawConfFecha = '';

  // ─── Cargar respuesta del banco (provisional) ──────────
  respIdLote: number | null = null;
  archivoRespuesta: File | null = null;
  subiendoRespuesta = signal(false);
  respError = signal('');
  respResultado = signal<RespuestaBancoResponse | null>(null);

  constructor() {
    this.dataSourceConf.sortingDataAccessor = (row: PagoProgramado, property: string): string | number => {
      switch (property) {
        case 'fechaProgramada': {
          const d = this.funcionesDatos.convertirFechaDesdeBackend(row.fechaProgramada);
          return d ? d.getTime() : 0;
        }
        case 'proveedor': return this.nombreBeneficiario(row);
        case 'factura':   return this.conceptoPago(row);
        case 'valor':     return Number(row.valor) || 0;
        case 'estado':    return this.etiquetaEstado(row.estado).texto;
        default:          return (row as any)[property] ?? '';
      }
    };
  }

  ngOnInit(): void {
    const idLote = this.route.snapshot.queryParamMap.get('idLote');
    if (idLote) this.respIdLote = +idLote;
    this.cargarCuentasBancarias();
    this.cargarPagosPorConfirmar();
  }

  private cargarCuentasBancarias(): void {
    const idEmpresa = this.idEmpresaSesion();
    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => {
        let lista = Array.isArray(data) ? data : [];
        if (idEmpresa) {
          lista = lista.filter(
            (c: any) => c.banco?.empresa?.codigo === idEmpresa || c.empresa?.codigo === idEmpresa,
          );
        }
        this.cuentasBancarias.set(lista);
      },
      error: () => this.cuentasBancarias.set([]),
    });
  }

  etiquetaCuenta(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
  }

  limpiarFiltros(): void {
    this.filtroCuenta.set(null);
    this.filtroOrigenes.set([]);
    this.filtroDesde.set('');
    this.filtroHasta.set('');
    this.filtroTexto.set('');
    this.cargarPagosPorConfirmar();
  }

  ngAfterViewChecked(): void {
    if (this.sort && this.dataSourceConf.sort !== this.sort) {
      this.dataSourceConf.sort = this.sort;
    }
    if (this.paginator && this.dataSourceConf.paginator !== this.paginator) {
      this.dataSourceConf.paginator = this.paginator;
    }
    if (this.pendienteFoco != null && this.refInputs) {
      const input = this.refInputs.find(
        (ref) => Number(ref.nativeElement.dataset['pagoId']) === this.pendienteFoco,
      );
      if (input) {
        input.nativeElement.focus();
        this.pendienteFoco = null;
      }
    }
  }

  // ─── Fecha del pago: datepicker + tipeo manual ─────────
  capturarConfFechaRaw(event: Event): void {
    this._rawConfFecha = (event.target as HTMLInputElement).value;
  }
  syncConfFechaFromRaw(event: FocusEvent): void {
    const raw = (this._rawConfFecha || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawConfFecha = '';
    const date = this.parseFechaLocalConf(raw);
    if (!date) return;
    this.confFecha = date;
    const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (this.confFechaInputRef?.nativeElement) this.confFechaInputRef.nativeElement.value = formatted; });
  }
  onConfFechaPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.confFecha = d;
    const formatted = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (this.confFechaInputRef?.nativeElement) this.confFechaInputRef.nativeElement.value = formatted; });
  }
  private parseFechaLocalConf(raw: string): Date | null {
    if (!raw) return null;
    const parts = raw.split('/');
    if (parts.length !== 3) return null;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (isNaN(dia) || dia < 1 || dia > 31 || isNaN(mes) || mes < 0 || mes > 11 || isNaN(anio) || anio < 1000) return null;
    const d = new Date(anio, mes, dia);
    return d.getFullYear() === anio && d.getMonth() === mes && d.getDate() === dia ? d : null;
  }

  // ─── Referencia bancaria por pago ───────────────────────
  referenciaDe(idPago: number): string {
    return this.referenciasPorPago()[idPago] ?? '';
  }
  setReferencia(idPago: number, valor: string): void {
    this.referenciasPorPago.update((m) => ({ ...m, [idPago]: valor }));
  }

  // ═══ CONFIRMACIÓN MANUAL ═════════════════════════════════

  /**
   * Pagos que siguen esperando al banco: Registrado (aún sin archivo) o
   * En archivo (ya enviado). Los débitos automáticos no entran porque nacen
   * confirmados y ya tienen su contabilidad.
   */
  cargarPagosPorConfirmar(): void {
    this.cargandoPorConfirmar.set(true);
    this.confError.set('');
    this.confSeleccionados.clear();

    // Los dos estados en una sola llamada al servidor (§2/§3.1 del contrato) — se acabó pedir
    // todo el historial de la empresa y filtrar acá. Los débitos automáticos ya no nacen
    // CONFIRMADO (docs/logica-negocio/pagos/PLAN-DEBITO-AUTOMATICO-CONTABILIZA-AL-CONFIRMAR.md en
    // saaBE): quedan REGISTRADO al aprobar y se contabilizan acá, con su referencia, así que
    // entran solos con estos dos estados, sin necesitar ninguna exclusión aparte.
    this.pagoS.listar({
      idEmpresa: this.idEmpresaSesion(),
      estados: [EstadoPagoProgramado.REGISTRADO, EstadoPagoProgramado.EN_ARCHIVO],
      idCuentaBancaria: this.filtroCuenta()?.codigo ?? undefined,
      origenes: this.filtroOrigenes(),
      desde: this.filtroDesde() || undefined,
      hasta: this.filtroHasta() || undefined,
      texto: this.filtroTexto().trim() || undefined,
    }).subscribe({
      next: (data) => {
        const filas = data ?? [];
        this.pagosPorConfirmar.set(filas);
        this.dataSourceConf.data = filas;
        this.referenciasPorPago.set({});
        this.cargandoPorConfirmar.set(false);
      },
      error: (err: Error) => {
        this.pagosPorConfirmar.set([]);
        this.cargandoPorConfirmar.set(false);
        this.confError.set(err.message);
      },
    });
  }

  estaSeleccionadoConf(pago: PagoProgramado): boolean {
    return this.confSeleccionados.has(pago.id);
  }

  alternarSeleccionConf(pago: PagoProgramado): void {
    if (this.confSeleccionados.has(pago.id)) {
      this.confSeleccionados.delete(pago.id);
    } else {
      this.confSeleccionados.add(pago.id);
      this.pendienteFoco = pago.id;
    }
  }

  get todosSeleccionadosConf(): boolean {
    const filas = this.pagosPorConfirmar();
    return filas.length > 0 && filas.every((p) => this.confSeleccionados.has(p.id));
  }

  alternarTodosConf(): void {
    if (this.todosSeleccionadosConf) {
      this.confSeleccionados.clear();
    } else {
      this.pagosPorConfirmar().forEach((p) => this.confSeleccionados.add(p.id));
    }
  }

  get totalSeleccionadoConf(): number {
    return this.pagosPorConfirmar()
      .filter((p) => this.confSeleccionados.has(p.id))
      .reduce((suma, p) => suma + (Number(p.valor) || 0), 0);
  }

  get puedeConfirmarManual(): boolean {
    return this.confSeleccionados.size > 0 && !!this.confFecha && !this.confirmandoManual();
  }

  /**
   * Confirmar genera contabilidad irreversible salvo reversión expresa, así que
   * se pide una confirmación explícita antes de lanzarla.
   */
  confirmarPagosManualmente(): void {
    if (!this.puedeConfirmarManual) return;

    const cantidad = this.confSeleccionados.size;
    const total = this.totalSeleccionadoConf.toFixed(2);
    const data: MotivoDialogData = {
      titulo: `Confirmar ${cantidad} pago(s) manualmente`,
      advertencia:
        `Se dará por pagado un total de $${total} como si el banco lo hubiera confirmado: `
        + 'se abona la factura y se generan el asiento contable y el movimiento bancario. '
        + 'Hágalo solo con los pagos que ya verificó en el estado de cuenta. Para deshacerlo '
        + 'habrá que revertir cada pago desde Consulta y gestión.',
      textoConfirmar: 'Sí, confirmar y contabilizar',
      requiereDobleConfirmacion: true,
      textoDobleConfirmacion: 'Verifiqué en el estado de cuenta que estos pagos se ejecutaron.',
    };

    this.dialog.open(MotivoDialogComponent, { width: '540px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.ejecutarConfirmacionManual(motivo);
    });
  }

  /**
   * El motivo del diálogo se guarda como parte de la observación del pago. Fecha y observación
   * son las mismas para todo el lote; la referencia bancaria va por pago en `referenciasPorPago`
   * (contrato docs/pagos/API-BANDEJA-CONFIRMACION-FILTROS.md §3.2 + el `POST /pgtr/confirmarManual`
   * ya extendido) — una sola llamada para todo el lote, cada pago con su propia referencia.
   */
  private ejecutarConfirmacionManual(motivo: string): void {
    this.confirmandoManual.set(true);
    this.confError.set('');
    this.confResultado.set(null);

    const nota = [this.confObservacion.trim(), motivo].filter((t) => !!t).join(' | ');
    const referencias = this.referenciasPorPago();
    const referenciasPorPago: Record<number, string> = {};
    for (const idPago of this.confSeleccionados) {
      const ref = (referencias[idPago] || '').trim();
      if (ref) referenciasPorPago[idPago] = ref;
    }

    this.pagoS.confirmarManual({
      idsPagos: Array.from(this.confSeleccionados),
      referenciasPorPago,
      fechaPago: this.fechaISO(this.confFecha),
      observacion: `Confirmación manual: ${nota}`,
      idUsuario: this.idUsuarioSesion(),
    }).subscribe({
      next: (resp) => {
        this.confirmandoManual.set(false);
        this.confResultado.set(resp);
        this.referenciasPorPago.set({});
        this.confObservacion = '';
        this.cargarPagosPorConfirmar();
        this.snackBar.open(resp.mensaje ?? 'Pagos confirmados.', 'Cerrar', { duration: 6000 });
      },
      error: (err: Error) => {
        this.confirmandoManual.set(false);
        this.confError.set(err.message);
      },
    });
  }

  // ═══ CARGAR RESPUESTA DEL BANCO (provisional) ═══════════

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoRespuesta = input.files?.length ? input.files[0] : null;
    this.respResultado.set(null);
    this.respError.set('');
  }

  get puedeSubirRespuesta(): boolean {
    return !!this.respIdLote && !!this.archivoRespuesta && !this.subiendoRespuesta();
  }

  /** El endpoint recibe el archivo como binario crudo, no como multipart. */
  async subirRespuesta(): Promise<void> {
    if (!this.puedeSubirRespuesta || !this.archivoRespuesta || !this.respIdLote) return;

    this.subiendoRespuesta.set(true);
    this.respError.set('');
    this.respResultado.set(null);

    try {
      const buffer = await this.archivoRespuesta.arrayBuffer();
      this.pagoS.cargarRespuesta(this.respIdLote, this.idUsuarioSesion(), buffer).subscribe({
        next: (resp) => {
          this.subiendoRespuesta.set(false);
          this.respResultado.set(resp);
          this.cargarPagosPorConfirmar();
          this.snackBar.open(resp.mensaje ?? 'Respuesta procesada.', 'Cerrar', { duration: 5000 });
        },
        error: (err: Error) => {
          this.subiendoRespuesta.set(false);
          this.respError.set(err.message);
        },
      });
    } catch {
      this.subiendoRespuesta.set(false);
      this.respError.set('No se pudo leer el archivo seleccionado.');
    }
  }

  // ═══ HELPERS ════════════════════════════════════════════

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  conceptoPago(pago: PagoProgramado): string {
    if (pago.origenExterno) {
      const etiqueta = etiquetaOrigenPagoExterno(pago.origenExterno);
      return pago.idOrigen != null ? `${etiqueta} #${pago.idOrigen}` : etiqueta;
    }
    return pago.facturaCompra?.numero || pago.egreso?.descripcion || '—';
  }

  nombreBeneficiario(pago: PagoProgramado): string {
    return pago.titular?.nombre || pago.beneficiarioNombre || '—';
  }

  etiquetaEstado(estado: number): { texto: string; clase: string } {
    return ESTADO_PAGO_PROGRAMADO_LABELS[estado] ?? { texto: `Estado ${estado}`, clase: 'badge-neutro' };
  }

  /**
   * El banco lo debita por convenio, no se transfiere. Se muestra en la fila para que la
   * persona sepa que la referencia que va a teclear viene de otro lado (no es un N° de
   * transferencia bancaria común).
   */
  esDebitoAutomatico(pago: PagoProgramado): boolean {
    return Number(pago.debitoAutomatico) === 1;
  }

  private fechaISO(fecha: Date | null): string | undefined {
    if (!fecha) return undefined;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return undefined;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
