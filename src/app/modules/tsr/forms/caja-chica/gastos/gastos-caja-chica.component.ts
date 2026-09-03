import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { GrupoProductoSelectorDialogComponent } from '../../../../../shared/components/grupo-producto-selector-dialog/grupo-producto-selector-dialog.component';
import { MotivoDialogComponent, MotivoDialogData } from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { SaldoFactura } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FileService } from '../../../../../shared/services/file.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';

import {
  DocumentoCruceProveedor,
  DocumentoCruceSelectorDialogComponent,
} from '../../../../cxp/dialog/documento-cruce-selector-dialog/documento-cruce-selector-dialog.component';
import { GrupoProductoPago } from '../../../../cxp/model/grupo_producto_pago';
import { ProductoPago } from '../../../../cxp/model/producto_pago';
import { AplicacionPagoCxpService } from '../../../../cxp/service/aplicacion-pago-cxp.service';
import { GrupoProductoPagoService } from '../../../../cxp/service/grupo-producto-pago.service';
import { ProductoPagoService } from '../../../../cxp/service/producto-pago.service';

import { CajaChica } from '../../../model/caja-chica';
import {
  MovimientoCajaChica,
  MovimientoCajaChicaFiltro,
  TipoMovimientoCajaChica,
} from '../../../model/movimiento-caja-chica';
import { SaldoCajaChica } from '../../../model/saldo-caja-chica';
import { Titular } from '../../../model/titular';
import { CajaChicaService } from '../../../service/caja-chica.service';
import { MovimientoCajaChicaService } from '../../../service/movimiento-caja-chica.service';
import { PathCajaChicaService } from '../../../service/path-caja-chica.service';
import { AdjuntosMovimientoDialogComponent } from './adjuntos-movimiento-dialog.component';

const RUBRO_ROL_PROVEEDOR = 2;

/** Etiqueta + ícono por tipo de movimiento (rubro 232). */
const TIPO_MOVIMIENTO_INFO: Record<number, { texto: string; icono: string }> = {
  [TipoMovimientoCajaChica.APERTURA]: { texto: 'Apertura', icono: 'play_circle' },
  [TipoMovimientoCajaChica.GASTO]: { texto: 'Gasto', icono: 'shopping_cart' },
  [TipoMovimientoCajaChica.REPOSICION]: { texto: 'Reposición', icono: 'add_circle' },
  [TipoMovimientoCajaChica.AJUSTE_MAS]: { texto: 'Ajuste +', icono: 'trending_up' },
  [TipoMovimientoCajaChica.AJUSTE_MENOS]: { texto: 'Ajuste −', icono: 'trending_down' },
};

/**
 * Registro de gastos de una caja chica: elige la caja, registra el gasto
 * (con adjunto opcional) y consulta/anula los movimientos ya registrados.
 *
 * `estado` en `MovimientoCajaChica` no viene documentado con un catálogo
 * propio en el contrato del prompt: se asume la convención del resto del
 * proyecto (1 = activo, cualquier otro valor = anulado). Si el backend usa
 * otro criterio, ajustar `estaActivo()`.
 */
@Component({
  selector: 'app-gastos-caja-chica',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './gastos-caja-chica.component.html',
  styleUrl: './gastos-caja-chica.component.scss',
})
export class GastosCajaChicaComponent implements OnInit {
  private cajaChicaS = inject(CajaChicaService);
  private movimientoS = inject(MovimientoCajaChicaService);
  private pathS = inject(PathCajaChicaService);
  private grupoProductoS = inject(GrupoProductoPagoService);
  private productoS = inject(ProductoPagoService);
  private aplicacionPagoS = inject(AplicacionPagoCxpService);
  private fileService = inject(FileService);
  private appState = inject(AppStateService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly TipoMovimientoCajaChica = TipoMovimientoCajaChica;
  readonly tiposMovimiento = [
    { valor: TipoMovimientoCajaChica.APERTURA, texto: 'Apertura' },
    { valor: TipoMovimientoCajaChica.GASTO, texto: 'Gasto' },
    { valor: TipoMovimientoCajaChica.REPOSICION, texto: 'Reposición' },
    { valor: TipoMovimientoCajaChica.AJUSTE_MAS, texto: 'Ajuste +' },
    { valor: TipoMovimientoCajaChica.AJUSTE_MENOS, texto: 'Ajuste −' },
  ];

  // ─── Cabecera: caja y saldo ─────────────────────────────
  cajas = signal<CajaChica[]>([]);
  cargandoCajas = signal(false);
  /** Vacío si no hay error. Distinto de `cajas().length === 0` sin error: eso es un vacío legítimo. */
  errorCajas = signal('');
  cajaSeleccionada = signal<CajaChica | null>(null);
  saldo = signal<SaldoCajaChica | null>(null);
  cargandoSaldo = signal(false);
  errorSaldo = signal('');

  // ─── Catálogos de producto ──────────────────────────────
  cargandoCatalogos = signal(false);
  gruposProducto = signal<GrupoProductoPago[]>([]);
  private todosProductos = signal<ProductoPago[]>([]);

  // ─── Formulario de gasto ────────────────────────────────
  formFecha: Date | null = new Date();
  formValor = '';
  formDescripcion = '';
  formObservacion = '';
  formGrupo: GrupoProductoPago | null = null;
  formIdGrupo: number | null = null;
  formIdProducto: number | null = null;
  filtroProducto = '';
  formBeneficiario = signal<Titular | null>(null);
  formNumeroDocumento = '';
  archivoSeleccionado: File | null = null;
  guardando = signal(false);
  error = signal('');
  exito = signal('');

  // ─── Documento pagado por el gasto (opcional) ───────────
  documentoSeleccionado = signal<DocumentoCruceProveedor | null>(null);
  cargandoSaldoDocumento = signal(false);
  saldoDocumento = signal<SaldoFactura | null>(null);

  // ─── Movimientos de la caja ─────────────────────────────
  movimientos = signal<MovimientoCajaChica[]>([]);
  cargandoMovimientos = signal(false);
  filtroDesde: Date | null = null;
  filtroHasta: Date | null = null;
  filtroTipo: number | null = null;
  anulandoId = signal<number | null>(null);

  readonly columnasMovimientos = [
    'fecha', 'tipo', 'descripcion', 'beneficiario', 'documento', 'valor', 'estado', 'acciones',
  ];

  /** El producto se elige dentro del grupo: la lista completa es muy larga. */
  get productosDelGrupo(): ProductoPago[] {
    const idGrupo = this.formIdGrupo;
    if (!idGrupo) return [];
    return this.todosProductos().filter((p) => p.grupoProducto?.codigo === idGrupo && p.estado === 1);
  }

  get productosFiltrados(): ProductoPago[] {
    const q = this.filtroProducto.trim().toLowerCase();
    const lista = this.productosDelGrupo;
    if (!q) return lista;
    return lista.filter((p) => (p.nombre ?? '').toLowerCase().includes(q));
  }

  etiquetaGrupo(grupo: GrupoProductoPago | null): string {
    if (!grupo) return '';
    const cuenta = grupo.planCuenta?.cuentaContable?.trim();
    const nombre = String(grupo.nombre ?? '');
    return cuenta ? `${cuenta} — ${nombre}` : nombre;
  }

  ngOnInit(): void {
    this.cargarCajas();
    this.cargarCatalogosProducto();
  }

  private cargarCajas(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.cajas.set([]);
      this.errorCajas.set('No se pudo determinar la empresa de la sesión.');
      this.snackBar.open('No se pudo determinar la empresa de la sesión', 'Cerrar', { duration: 5000 });
      return;
    }

    this.cargandoCajas.set(true);
    this.errorCajas.set('');
    this.cajaChicaS.activas(idEmpresa).subscribe({
      next: (data) => {
        this.cajas.set(Array.isArray(data) ? data : []);
        this.cargandoCajas.set(false);
      },
      error: (err) => {
        this.cajas.set([]);
        this.cargandoCajas.set(false);
        this.errorCajas.set(CajaChicaService.mensajeError(err));
        this.snackBar.open('No se pudieron cargar las cajas chicas activas.', 'Cerrar', { duration: 5000 });
      },
    });
  }

  /** Botón "Reintentar" del estado de error de la lista de cajas. */
  reintentarCajas(): void {
    this.cargarCajas();
  }

  private cargarCatalogosProducto(): void {
    this.cargandoCatalogos.set(true);
    this.grupoProductoS.getAll().subscribe({
      next: (data) => this.gruposProducto.set((data ?? []).filter((g) => g.estado === 1)),
      error: () => this.gruposProducto.set([]),
    });
    this.productoS.getAll().subscribe({
      next: (data) => {
        this.todosProductos.set(data ?? []);
        this.cargandoCatalogos.set(false);
      },
      error: () => {
        this.todosProductos.set([]);
        this.cargandoCatalogos.set(false);
      },
    });
  }

  onCambioCaja(caja: CajaChica | null): void {
    this.cajaSeleccionada.set(caja);
    this.saldo.set(null);
    this.movimientos.set([]);
    this.limpiarFormulario();
    if (!caja) return;
    this.cargarSaldo(caja.codigo);
    this.cargarMovimientos();
  }

  private cargarSaldo(idCaja: number): void {
    this.cargandoSaldo.set(true);
    this.errorSaldo.set('');
    this.cajaChicaS.saldo(idCaja).subscribe({
      next: (s) => {
        this.saldo.set(s);
        this.cargandoSaldo.set(false);
      },
      error: (err) => {
        this.saldo.set(null);
        this.cargandoSaldo.set(false);
        this.errorSaldo.set(CajaChicaService.mensajeError(err));
      },
    });
  }

  /** Botón "Reintentar" del estado de error del saldo. */
  reintentarSaldo(): void {
    const caja = this.cajaSeleccionada();
    if (caja) this.cargarSaldo(caja.codigo);
  }

  /** Saldo que quedaría en la caja si se registra el gasto tal como está tipeado ahora. */
  get saldoCajaDespues(): number | null {
    const s = this.saldo();
    if (!s) return null;
    return s.saldo - this.formValorNumerico;
  }

  /** % del fondo que quedaría disponible después de este gasto, para la barra. */
  get porcentajeCajaDespues(): number | null {
    const s = this.saldo();
    if (!s || !s.fondo) return null;
    return Math.max(0, Math.min(100, ((this.saldoCajaDespues ?? s.saldo) / s.fondo) * 100));
  }

  // ═══ FORMULARIO DE GASTO ═════════════════════════════════

  buscarGrupo(): void {
    this.dialog.open(GrupoProductoSelectorDialogComponent, {
      width: '760px',
      maxWidth: '98vw',
      data: { grupos: this.gruposProducto() },
    }).afterClosed().subscribe((grupo) => {
      if (!grupo) return;
      this.formGrupo = grupo as GrupoProductoPago;
      this.formIdGrupo = grupo.codigo;
      this.formIdProducto = null;
      this.filtroProducto = '';
    });
  }

  buscarBeneficiario(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: RUBRO_ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar beneficiario' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (!titular) return;
      this.formBeneficiario.set(titular);
      // El documento elegido, si lo hay, era del beneficiario anterior: se limpia por comodidad
      // (el servidor igual revalida que el documento sea de este titular — ver API-GASTO-CAJA-CHICA.md).
      this.quitarDocumento();
    });
  }

  nombreBeneficiario(): string {
    const t = this.formBeneficiario();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  quitarBeneficiario(): void {
    this.formBeneficiario.set(null);
    this.quitarDocumento();
  }

  // ═══ DOCUMENTO PAGADO POR EL GASTO (opcional) ═══════════

  buscarDocumento(): void {
    const beneficiario = this.formBeneficiario();
    if (!beneficiario) return;

    this.dialog.open(DocumentoCruceSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: {
        codigoTitular: beneficiario.codigo,
        nombreTitular: this.nombreBeneficiario(),
        soloPendientes: true,
      },
    }).afterClosed().subscribe((doc: DocumentoCruceProveedor | null) => {
      if (doc) this.seleccionarDocumento(doc);
    });
  }

  private seleccionarDocumento(doc: DocumentoCruceProveedor): void {
    this.documentoSeleccionado.set(doc);
    this.saldoDocumento.set(null);
    // Autopoblado del comprobante: es una etiqueta, el vínculo real es idDocumento (ver
    // API-GASTO-CAJA-CHICA.md, sección "Trampas"). Solo si el usuario no había tipeado nada.
    if (!this.formNumeroDocumento.trim()) {
      this.formNumeroDocumento = doc.numero ?? '';
    }

    this.cargandoSaldoDocumento.set(true);
    const saldo$ = doc.tipo === 'FACTURA'
      ? this.aplicacionPagoS.getSaldo(doc.id)
      : this.aplicacionPagoS.getSaldoLiquidacion(doc.id);

    saldo$.subscribe({
      next: (s) => {
        this.saldoDocumento.set(s);
        this.cargandoSaldoDocumento.set(false);
      },
      error: () => {
        this.saldoDocumento.set(null);
        this.cargandoSaldoDocumento.set(false);
        this.snackBar.open('No se pudo consultar el saldo del documento.', 'Cerrar', { duration: 5000 });
      },
    });
  }

  quitarDocumento(): void {
    this.documentoSeleccionado.set(null);
    this.saldoDocumento.set(null);
  }

  etiquetaTipoDocumento(tipo: 'FACTURA' | 'LIQUIDACION_COMPRA'): string {
    return tipo === 'FACTURA' ? 'Factura' : 'Liquidación';
  }

  /** Saldo pendiente del documento antes de este gasto, o null mientras no se conoce. */
  get saldoAntesDocumento(): number | null {
    return this.saldoDocumento()?.saldoPendiente ?? null;
  }

  /** Saldo que quedaría pendiente en el documento después de este gasto. */
  get saldoDespuesDocumento(): number | null {
    const antes = this.saldoAntesDocumento;
    if (antes == null) return null;
    return antes - this.formValorNumerico;
  }

  /** true cuando el documento quedaría saldado (dentro de tolerancia de redondeo). */
  get documentoQuedaSaldado(): boolean {
    const despues = this.saldoDespuesDocumento;
    return despues != null && despues <= 0.01;
  }

  /** Validación espejo: el servidor es quien manda, esto solo evita un viaje al backend de más. */
  get documentoExcedeSaldo(): boolean {
    const antes = this.saldoAntesDocumento;
    return antes != null && this.formValorNumerico > antes + 0.01;
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      this.archivoSeleccionado = null;
      return;
    }
    const validacion = this.fileService.validateFile(file);
    if (!validacion.valid) {
      this.snackBar.open(validacion.message, 'Cerrar', { duration: 5000 });
      input.value = '';
      this.archivoSeleccionado = null;
      return;
    }
    this.archivoSeleccionado = file;
  }

  quitarArchivo(): void {
    this.archivoSeleccionado = null;
  }

  get formValorNumerico(): number {
    const v = parseFloat(String(this.formValor).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  /** Motivo por el que el gasto excede algún tope, o '' si no excede ninguno. */
  get motivoExcedeTope(): string {
    const caja = this.cajaSeleccionada();
    const valor = this.formValorNumerico;
    if (!caja || valor <= 0) return '';

    const saldoDisponible = this.saldo()?.saldo;
    if (saldoDisponible != null && valor > saldoDisponible + 0.01) {
      return `El valor supera el saldo disponible de la caja ($${saldoDisponible.toFixed(2)}).`;
    }
    if (caja.montoMaximoGasto != null && valor > caja.montoMaximoGasto + 0.01) {
      return `El valor supera el tope por gasto de esta caja ($${caja.montoMaximoGasto.toFixed(2)}).`;
    }
    return '';
  }

  get puedeGuardar(): boolean {
    return !!this.cajaSeleccionada()
      && !!this.formFecha
      && this.formValorNumerico > 0
      && !this.motivoExcedeTope
      && !!this.formDescripcion.trim()
      && !!this.formObservacion.trim()
      && this.formIdProducto != null
      // Con documento elegido, el beneficiario pasa a ser obligatorio (API-GASTO-CAJA-CHICA.md).
      && (!this.documentoSeleccionado() || !!this.formBeneficiario())
      && !this.documentoExcedeSaldo
      && !this.guardando();
  }

  private fechaISO(fecha: Date | null): string {
    if (!fecha) return '';
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  registrarGasto(): void {
    const caja = this.cajaSeleccionada();
    if (!this.puedeGuardar || !caja || this.formIdProducto == null) return;

    this.guardando.set(true);
    this.error.set('');
    this.exito.set('');

    const documento = this.documentoSeleccionado();

    this.movimientoS.gasto({
      idCaja: caja.codigo,
      fecha: this.fechaISO(this.formFecha),
      valor: this.formValorNumerico,
      descripcion: this.formDescripcion.trim(),
      observacion: this.formObservacion.trim(),
      idProducto: this.formIdProducto,
      idTitular: this.formBeneficiario()?.codigo ?? undefined,
      numeroDocumento: this.formNumeroDocumento.trim() || undefined,
      idUsuario: this.appState.getIdUsuario(),
      // Las dos van juntas o ninguna — documento siempre trae tipo+id (API-GASTO-CAJA-CHICA.md).
      ...(documento ? { tipoDocumento: documento.tipo, idDocumento: documento.id } : {}),
    }).subscribe({
      next: (movimiento) => {
        this.guardando.set(false);
        this.exito.set('Gasto registrado correctamente.');
        this.cargarSaldo(caja.codigo);
        this.cargarMovimientos();

        if (this.archivoSeleccionado && movimiento?.codigo) {
          this.subirAdjunto(movimiento.codigo, this.archivoSeleccionado);
        }

        this.limpiarFormulario();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(CajaChicaService.mensajeError(err));
      },
    });
  }

  /** El gasto ya quedó registrado; si esto falla, se avisa aparte sin invalidar el gasto. */
  private subirAdjunto(idMovimiento: number, archivo: File): void {
    const caja = this.cajaSeleccionada();
    if (!caja) return;
    const uploadPath = `caja-chica/${caja.codigo}/${idMovimiento}`;

    this.fileService.uploadFileCustomPath(archivo, uploadPath).subscribe({
      next: (resp) => {
        if (!resp?.filePath) {
          this.snackBar.open('El gasto se registró, pero el servidor no devolvió la ruta del adjunto.', 'Cerrar', { duration: 6000 });
          return;
        }
        this.pathS.add({
          movimiento: { codigo: idMovimiento },
          path: resp.filePath,
          nombreDoc: archivo.name,
          tipoDoc: archivo.name.substring(archivo.name.lastIndexOf('.') + 1),
          usuario: { codigo: this.appState.getIdUsuario() },
        }).subscribe({
          next: () => this.snackBar.open('Gasto y adjunto registrados correctamente.', 'Cerrar', { duration: 4000 }),
          error: () => this.snackBar.open('El gasto se registró, pero no se pudo guardar el registro del adjunto.', 'Cerrar', { duration: 6000 }),
        });
      },
      error: () => this.snackBar.open('El gasto se registró, pero no se pudo subir el adjunto.', 'Cerrar', { duration: 6000 }),
    });
  }

  limpiarFormulario(): void {
    this.formFecha = new Date();
    this.formValor = '';
    this.formDescripcion = '';
    this.formObservacion = '';
    this.formGrupo = null;
    this.formIdGrupo = null;
    this.formIdProducto = null;
    this.filtroProducto = '';
    this.formBeneficiario.set(null);
    this.formNumeroDocumento = '';
    this.archivoSeleccionado = null;
    this.documentoSeleccionado.set(null);
    this.saldoDocumento.set(null);
  }

  // ═══ MOVIMIENTOS ═════════════════════════════════════════

  cargarMovimientos(): void {
    const caja = this.cajaSeleccionada();
    if (!caja) return;

    this.cargandoMovimientos.set(true);
    const filtro: MovimientoCajaChicaFiltro = {
      idCaja: caja.codigo,
      desde: this.filtroDesde ? this.fechaISO(this.filtroDesde) : undefined,
      hasta: this.filtroHasta ? this.fechaISO(this.filtroHasta) : undefined,
      tipo: this.filtroTipo ?? undefined,
    };

    this.movimientoS.listar(filtro).subscribe({
      next: (data) => {
        this.movimientos.set(Array.isArray(data) ? data : []);
        this.cargandoMovimientos.set(false);
      },
      error: (err) => {
        this.movimientos.set([]);
        this.cargandoMovimientos.set(false);
        this.snackBar.open(MovimientoCajaChicaService.mensajeError(err), 'Cerrar', { duration: 6000 });
      },
    });
  }

  limpiarFiltrosMovimientos(): void {
    this.filtroDesde = null;
    this.filtroHasta = null;
    this.filtroTipo = null;
    this.cargarMovimientos();
  }

  tipoDeMovimiento(m: MovimientoCajaChica): number | null {
    return m.rubroTipoMovimientoH ?? m.rubroTipoMovimientoP ?? null;
  }

  infoTipo(m: MovimientoCajaChica): { texto: string; icono: string } {
    const tipo = this.tipoDeMovimiento(m);
    return (tipo != null && TIPO_MOVIMIENTO_INFO[tipo]) || { texto: `Tipo ${tipo ?? '—'}`, icono: 'help_outline' };
  }

  nombreBeneficiarioFila(m: MovimientoCajaChica): string {
    const t = m.titular;
    if (!t) return '—';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  /** Texto de la columna "Documento": null en la mayoría de las filas (gasto sin documento). */
  documentoFila(m: MovimientoCajaChica): string {
    if (!m.documentoTipo) return '—';
    const tipo = m.documentoTipo === 'FACTURA' ? 'Factura' : 'Liquidación';
    return m.documentoNumero ? `${tipo} ${m.documentoNumero}` : tipo;
  }

  /** Convención del proyecto: 1 = activo; cualquier otro valor se trata como anulado. Ver nota de la clase. */
  estaActivo(m: MovimientoCajaChica): boolean {
    return m.estado == null || Number(m.estado) === 1;
  }

  esGasto(m: MovimientoCajaChica): boolean {
    return this.tipoDeMovimiento(m) === TipoMovimientoCajaChica.GASTO;
  }

  puedeAnular(m: MovimientoCajaChica): boolean {
    return this.esGasto(m) && this.estaActivo(m);
  }

  confirmarAnulacion(m: MovimientoCajaChica): void {
    const data: MotivoDialogData = {
      titulo: `Anular gasto N° ${m.codigo}`,
      advertencia: 'Se anulará el gasto y su valor volverá a estar disponible en el saldo de la caja. '
        + 'Si el gasto ya quedó dentro de un cierre confirmado, el backend rechazará la anulación.',
      textoConfirmar: 'Sí, anular',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;

      this.anulandoId.set(m.codigo);
      this.movimientoS.anular(m.codigo, { motivo, idUsuario: this.appState.getIdUsuario() }).subscribe({
        next: () => {
          this.anulandoId.set(null);
          this.snackBar.open('Gasto anulado correctamente.', 'Cerrar', { duration: 4000 });
          this.cargarMovimientos();
          const caja = this.cajaSeleccionada();
          if (caja) this.cargarSaldo(caja.codigo);
        },
        error: (err) => {
          this.anulandoId.set(null);
          this.snackBar.open(MovimientoCajaChicaService.mensajeError(err), 'Cerrar', { duration: 6000 });
        },
      });
    });
  }

  verAdjuntos(m: MovimientoCajaChica): void {
    this.dialog.open(AdjuntosMovimientoDialogComponent, {
      width: '520px',
      maxWidth: '96vw',
      data: { idMovimiento: m.codigo, numero: m.codigo },
    });
  }

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
