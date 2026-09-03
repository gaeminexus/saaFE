import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { DocumentoCxp } from '../../../model/documento-cxp';
import { AnularDocumentoCompraRequest, MovimientoRelacionadoCompra } from '../../../model/anulacion-documento-compra';
import { HistorialAbonosFacturaComponent } from '../../pagos/historial-abonos-factura/historial-abonos-factura.component';
import { ReembolsosFacturaComponent } from '../reembolsos-factura/reembolsos-factura.component';
import {
  AnularDocumentoCompraDialogComponent,
  AnularDocumentoCompraDialogResult,
} from '../dialogs/anular-documento-compra-dialog/anular-documento-compra-dialog.component';
import { DetalleFacturaCompraService } from '../../../service/detalle-factura-compra.service';
import { DetalleLiquidacionCompraCompraService } from '../../../service/detalle-liquidacion-compra-compra.service';
import { DetalleNotaCreditoCompraService } from '../../../service/detalle-nota-credito-compra.service';
import { DetalleNotaDebitoCompraService } from '../../../service/detalle-nota-debito-compra.service';
import { DetalleRetencionCompraService } from '../../../service/detalle-retencion-compra.service';
import { DetalleRetencionCompraV2Service } from '../../../service/detalle-retencion-compra-v2.service';
import { DocumentoCxpService } from '../../../service/documento-cxp.service';
import { FacturaCompraService } from '../../../service/factura-compra.service';
import { FormaPagoFacturaCompraService } from '../../../service/forma-pago-factura-compra.service';
import { FormaPagoLiquidacionCompraCompraService } from '../../../service/forma-pago-liquidacion-compra-compra.service';
import { LiquidacionCompraCompraService } from '../../../service/liquidacion-compra-compra.service';
import { NotaCreditoCompraService } from '../../../service/nota-credito-compra.service';
import { NotaDebitoCompraService } from '../../../service/nota-debito-compra.service';
import { RetencionCompraService } from '../../../service/retencion-compra.service';
import { RetencionCompraV2Service } from '../../../service/retencion-compra-v2.service';

/** Tablas destino de compra que sí admiten anulación (ítem 12/13, 2026-08-28). Las retenciones quedan fuera: sin endpoint. */
const TABLAS_ANULABLES = ['FACTURA_COMPRA', 'LIQUIDACION_COMPRA', 'LIQUIDACION_COMPRA_COMPRA', 'NOTA_CREDITO_COMPRA', 'NOTA_DEBITO_COMPRA'];
/** La liquidación de compra no tiene movimientos que cascadear — anulación simple, sin consulta previa. */
const TABLAS_LIQUIDACION = ['LIQUIDACION_COMPRA', 'LIQUIDACION_COMPRA_COMPRA'];

/**
 * Columnas del detalle de una retención (RTCM/DRCM y RCV2/DRC2 comparten los
 * mismos nombres de campo en el backend). Ojo: son `codRetencion`,
 * `porcentajeReten` y `valorReten` — no `codigoRetencion`/`porcentaje`/
 * `valorRetenido`, que dejaban la tabla con las celdas en blanco.
 */
const COLUMNAS_RETENCION = ['codRetencion', 'codImpuesto', 'numDocReten', 'baseImponible', 'porcentajeReten', 'valorReten'];

@Component({
  selector: 'app-consulta-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule, HistorialAbonosFacturaComponent, ReembolsosFacturaComponent],
  templateUrl: './consulta-documentos.component.html',
  styleUrl: './consulta-documentos.component.scss',
})
export class ConsultaDocumentosComponent implements OnInit {
  @ViewChild('filtroFechaDesdeInput', { read: ElementRef }) filtroFechaDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('filtroFechaHastaInput', { read: ElementRef }) filtroFechaHastaInputRef!: ElementRef<HTMLInputElement>;

  private snackBar = inject(MatSnackBar);
  private funcionesDatosS = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private appState = inject(AppStateService);

  private _rawFiltroFechaDesde = '';
  private _rawFiltroFechaHasta = '';
  private docService = inject(DocumentoCxpService);
  private facturaService = inject(FacturaCompraService);
  private detalleFacturaService = inject(DetalleFacturaCompraService);
  private formaPagoFacturaService = inject(FormaPagoFacturaCompraService);
  private liqService = inject(LiquidacionCompraCompraService);
  private detalleLiqService = inject(DetalleLiquidacionCompraCompraService);
  private formaPagoLiqService = inject(FormaPagoLiquidacionCompraCompraService);
  private ncService = inject(NotaCreditoCompraService);
  private detalleNcService = inject(DetalleNotaCreditoCompraService);
  private ndService = inject(NotaDebitoCompraService);
  private detalleNdService = inject(DetalleNotaDebitoCompraService);
  private retService = inject(RetencionCompraService);
  private detalleRetService = inject(DetalleRetencionCompraService);
  private retV2Service = inject(RetencionCompraV2Service);
  private detalleRetV2Service = inject(DetalleRetencionCompraV2Service);

  // Vista
  vista: 'lista' | 'detalle' = 'lista';
  cargando = signal(false);
  cargandoDetalle = signal(false);
  errorDetalle = signal('');

  // Lista (usa DocumentoCxp estado=3 como índice)
  todosDocumentos: DocumentoCxp[] = [];
  dsDocumentos = new MatTableDataSource<DocumentoCxp>([]);
  columnas = ['tipoComprobante', 'tipoTablaDestino', 'rucEmisor', 'razonSocialEmisor', 'serieComprobante', 'fechaEmision', 'valorSinImpuestos', 'iva', 'importeTotal', 'acciones'];

  // Filtros
  filtroRuc = '';
  filtroProveedor = '';
  filtroTipo = '';
  filtroTabla = '';
  filtroFechaDesdeControl = new UntypedFormControl(null);
  filtroFechaHastaControl = new UntypedFormControl(null);

  // Detalle — datos reales de la tabla destino
  docSeleccionado: DocumentoCxp | null = null;
  docReal: any = null;
  detallesDoc = new MatTableDataSource<any>([]);
  formasPagoDoc: any[] = [];
  columnasDetalle: string[] = [];

  // Anulación (ítem 12/13, 2026-08-28)
  consultandoMovimientos = signal(false);
  anulando = signal(false);

  private get idEmpresa(): number { return Number(localStorage.getItem('empresaCodigo') || localStorage.getItem('empresaId') || 1); }

  ngOnInit(): void { this.cargar(); }

  // ─── LISTA ─────────────────────────────────────────────

  cargar(): void {
    this.cargando.set(true);
    this.docService.getByEmpresaEstado(this.idEmpresa, 3).subscribe({
      next: (data) => { this.todosDocumentos = data || []; this.aplicarFiltros(); this.cargando.set(false); },
      error: () => { this.snackBar.open('No se pudo cargar los documentos', 'Cerrar', { duration: 4000 }); this.cargando.set(false); },
    });
  }

  buscar(): void { this.aplicarFiltros(); }

  limpiarFiltros(): void {
    this.filtroRuc = ''; this.filtroProveedor = ''; this.filtroTipo = '';
    this.filtroTabla = '';
    this.filtroFechaDesdeControl.setValue(null, { emitEvent: false });
    this.filtroFechaHastaControl.setValue(null, { emitEvent: false });
    setTimeout(() => {
      if (this.filtroFechaDesdeInputRef?.nativeElement) this.filtroFechaDesdeInputRef.nativeElement.value = '';
      if (this.filtroFechaHastaInputRef?.nativeElement) this.filtroFechaHastaInputRef.nativeElement.value = '';
    });
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    let r = [...this.todosDocumentos];
    if (this.filtroRuc.trim()) r = r.filter(d => d.rucEmisor?.toLowerCase().includes(this.filtroRuc.trim().toLowerCase()));
    if (this.filtroProveedor.trim()) r = r.filter(d => d.razonSocialEmisor?.toLowerCase().includes(this.filtroProveedor.trim().toLowerCase()));
    if (this.filtroTipo.trim()) r = r.filter(d => d.tipoComprobante?.toLowerCase().includes(this.filtroTipo.trim().toLowerCase()));
    if (this.filtroTabla.trim()) r = r.filter(d => d.tipoTablaDestino?.toLowerCase().includes(this.filtroTabla.trim().toLowerCase()));
    const desde = this.toISODate(this.filtroFechaDesdeControl.value);
    const hasta = this.toISODate(this.filtroFechaHastaControl.value);
    if (desde) r = r.filter(d => this.strFecha(d.fechaEmision) >= desde);
    if (hasta) r = r.filter(d => this.strFecha(d.fechaEmision) <= hasta);
    this.dsDocumentos.data = r;
  }

  private toISODate(date: Date | null): string {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ─── DETALLE ──────────────────────────────────────────

  /**
   * Criterios para traer las líneas hijas de un documento.
   *
   * El endpoint genérico selectByCriteria espera una lista de DatosBusqueda,
   * no un objeto plano como `{ factura: { id } }`: con esa forma el backend no
   * arma el filtro y la pantalla queda "sin líneas de detalle" sin ningún error
   * visible. Ver docs/transversal/guia-selectByCriteria.md.
   */
  private criteriosPorPadre(campoPadre: string, id: number): DatosBusqueda[] {
    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatos.LONG, campoPadre, 'id', String(id), TipoComandosBusqueda.IGUAL,
    );
    criterio.setNumeroCampoRepetido(0);
    return [criterio];
  }

  verDetalle(doc: DocumentoCxp): void {
    this.docSeleccionado = doc;
    this.docReal = null;
    this.detallesDoc.data = [];
    this.formasPagoDoc = [];
    this.errorDetalle.set('');
    this.vista = 'detalle';
    this.cargandoDetalle.set(true);
    const id = doc.idDocumentoBD;

    switch (doc.tipoTablaDestino) {
      case 'FACTURA_COMPRA':
        this.columnasDetalle = ['descripcion', 'cantidad', 'valor', 'subTotal', 'descuento', 'baseImponible', 'porcentajeIVA', 'valorIVA', 'total'];
        forkJoin({
          cab: this.facturaService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleFacturaService.selectByCriteria(this.criteriosPorPadre('factura', id)).pipe(this.capturarErrorDetalle()),
          fp:  this.formaPagoFacturaService.selectByCriteria(this.criteriosPorPadre('factura', id)).pipe(catchError(() => of([]))),
        }).subscribe(({ cab, det, fp }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.formasPagoDoc = fp || []; this.cargandoDetalle.set(false);
        });
        break;

      // El backend graba las liquidaciones como LIQUIDACION_COMPRA_COMPRA
      // (ProcesoCargaDocumentosServiceImpl); LIQUIDACION_COMPRA queda por
      // registros antiguos.
      case 'LIQUIDACION_COMPRA':
      case 'LIQUIDACION_COMPRA_COMPRA':
        this.columnasDetalle = ['descripcion', 'cantidad', 'valor', 'subTotal', 'descuento', 'baseImponible', 'porcentajeIVA', 'valorIVA', 'total'];
        forkJoin({
          cab: this.liqService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleLiqService.selectByCriteria(this.criteriosPorPadre('liquidacion', id)).pipe(this.capturarErrorDetalle()),
          fp:  this.formaPagoLiqService.selectByCriteria(this.criteriosPorPadre('liquidacion', id)).pipe(catchError(() => of([]))),
        }).subscribe(({ cab, det, fp }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.formasPagoDoc = fp || []; this.cargandoDetalle.set(false);
        });
        break;

      case 'NOTA_CREDITO_COMPRA':
        this.columnasDetalle = ['descripcion', 'cantidad', 'valor', 'subTotal', 'descuento', 'baseImponible', 'porcentajeIVA', 'valorIVA', 'total'];
        forkJoin({
          cab: this.ncService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleNcService.selectByCriteria(this.criteriosPorPadre('notaCredito', id)).pipe(this.capturarErrorDetalle()),
        }).subscribe(({ cab, det }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.cargandoDetalle.set(false);
        });
        break;

      case 'NOTA_DEBITO_COMPRA':
        this.columnasDetalle = ['descripcion', 'valor', 'baseImponible', 'porcentajeIVA', 'valorIVA', 'total'];
        forkJoin({
          cab: this.ndService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleNdService.selectByCriteria(this.criteriosPorPadre('notaDebito', id)).pipe(this.capturarErrorDetalle()),
        }).subscribe(({ cab, det }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.cargandoDetalle.set(false);
        });
        break;

      // Retención "clásica" (PGS.RTCM). Sólo quedan registros antiguos: la carga
      // de documentos actual manda todo comprobante de retención a la V2.
      case 'RETENCION_COMPRA':
        this.columnasDetalle = COLUMNAS_RETENCION;
        forkJoin({
          cab: this.retService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleRetService.selectByCriteria(this.criteriosPorPadre('retencion', id)).pipe(this.capturarErrorDetalle()),
        }).subscribe(({ cab, det }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.cargandoDetalle.set(false);
        });
        break;

      // Retención V2 (PGS.RCV2 + PGS.DRC2). Es la tabla destino que usa hoy la
      // carga de documentos tanto para "Comprobante de Retención" como para
      // "Comprobante de Retención electrónica versión 2.0".
      case 'RETENCION_COMPRA_V2':
        this.columnasDetalle = COLUMNAS_RETENCION;
        forkJoin({
          cab: this.retV2Service.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleRetV2Service.getByRetencionCompraV2(id).pipe(this.capturarErrorDetalle()),
        }).subscribe(({ cab, det }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.cargandoDetalle.set(false);
        });
        break;

      default:
        // Sin este aviso, una tabla destino no contemplada deja la pantalla en
        // blanco sin explicar por qué (fue el caso de RETENCION_COMPRA_V2).
        this.errorDetalle.set(`No hay vista de detalle para la tabla destino "${doc.tipoTablaDestino}".`);
        this.cargandoDetalle.set(false);
    }
  }

  /**
   * Un fallo al traer el detalle deja la tabla vacía, que se ve igual que un
   * documento sin líneas. Se registra el error para poder distinguirlos.
   */
  private capturarErrorDetalle<T>() {
    return catchError<T[] | null, Observable<T[]>>(() => {
      this.errorDetalle.set('No se pudo cargar el detalle del documento.');
      return of([] as T[]);
    });
  }

  volverLista(): void { this.vista = 'lista'; this.docSeleccionado = null; this.docReal = null; }

  // ─── ANULACIÓN (ítem 12/13, 2026-08-28) ────────────────

  /** Solo factura/liquidación/NC/ND de compra admiten anulación — las retenciones no tienen endpoint. */
  esDocumentoAnulable(): boolean {
    return TABLAS_ANULABLES.includes(this.docSeleccionado?.tipoTablaDestino || '');
  }

  get documentoAnulado(): boolean {
    return Number(this.docReal?.estadoEmision) === 3;
  }

  get puedeAnularDocumento(): boolean {
    return !!this.docReal && this.esDocumentoAnulable() && !this.documentoAnulado
      && !this.consultandoMovimientos() && !this.anulando();
  }

  private numeroDocumento(): string {
    if (this.docReal?.numero) return this.docReal.numero;
    const { numEstablecimiento, numPtoEmision, secuencial } = this.docReal ?? {};
    if (numEstablecimiento && numPtoEmision && secuencial) {
      return `${numEstablecimiento}-${numPtoEmision}-${secuencial}`;
    }
    return this.docSeleccionado?.serieComprobante || String(this.docReal?.id ?? '');
  }

  /**
   * Antes de preguntar, hay que saber si el documento tiene movimientos relacionados
   * (pagos/notas/retenciones/anticipos cruzados) — la liquidación de compra es la única
   * excepción, no tiene nada que cascadear (verificado en backend, sin FK que la relacione).
   */
  anularDocumento(): void {
    const doc = this.docSeleccionado;
    const real = this.docReal;
    if (!doc || !real || !this.puedeAnularDocumento) return;

    const tipo = doc.tipoTablaDestino;
    if (TABLAS_LIQUIDACION.includes(tipo)) {
      this.abrirDialogoAnular(tipo, real.id, null);
      return;
    }

    this.consultandoMovimientos.set(true);
    this.servicioConMovimientos(tipo).movimientosRelacionados(real.id).subscribe({
      next: (movs) => {
        this.consultandoMovimientos.set(false);
        this.abrirDialogoAnular(tipo, real.id, movs || []);
      },
      error: (err: Error) => {
        this.consultandoMovimientos.set(false);
        this.snackBar.open(
          mensajeDeError(err, 'No se pudieron consultar los movimientos relacionados'),
          'Cerrar', { duration: 6000 },
        );
      },
    });
  }

  private servicioConMovimientos(tipo: string): FacturaCompraService | NotaCreditoCompraService | NotaDebitoCompraService {
    if (tipo === 'NOTA_CREDITO_COMPRA') return this.ncService;
    if (tipo === 'NOTA_DEBITO_COMPRA') return this.ndService;
    return this.facturaService;
  }

  private abrirDialogoAnular(tipo: string, id: number, movimientos: MovimientoRelacionadoCompra[] | null): void {
    this.dialog.open(AnularDocumentoCompraDialogComponent, {
      width: '560px',
      disableClose: true,
      data: { tipoLabel: this.tipoTablaLabel(tipo), numero: this.numeroDocumento(), movimientos },
    }).afterClosed().subscribe((result: AnularDocumentoCompraDialogResult | null) => {
      if (!result) return;
      this.ejecutarAnulacion(tipo, id, result);
    });
  }

  private usuarioSesion(): string {
    try {
      const u = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');
      if (u) return JSON.parse(u)?.username || JSON.parse(u)?.nombre || JSON.parse(u)?.login || 'sistema';
    } catch { /* */ }
    return 'sistema';
  }

  private ejecutarAnulacion(tipo: string, id: number, resultado: AnularDocumentoCompraDialogResult): void {
    this.anulando.set(true);
    const usuario = this.usuarioSesion();

    const obs$ = TABLAS_LIQUIDACION.includes(tipo)
      ? this.liqService.anular(id, { motivo: resultado.motivo, usuario })
      : this.servicioConMovimientos(tipo).anular(id, {
          motivo: resultado.motivo,
          usuario,
          idUsuario: this.appState.getIdUsuario(),
          anularEnCascada: resultado.anularEnCascada,
        } as AnularDocumentoCompraRequest);

    obs$.subscribe({
      next: (resp) => {
        this.anulando.set(false);
        if (!resp.exito) {
          this.snackBar.open(resp.mensaje || 'No se pudo anular el documento', 'Cerrar', { duration: 6000 });
          return;
        }
        this.snackBar.open(resp.mensaje || 'Documento anulado correctamente', 'Cerrar', { duration: 5000 });
        // Recarga el detalle para reflejar estadoEmision y los campos de auditoría nuevos.
        if (this.docSeleccionado) this.verDetalle(this.docSeleccionado);
      },
      error: (err: Error & { status?: number }) => {
        this.anulando.set(false);
        // 409 = el documento tenía movimientos relacionados y se llamó sin cascada (carrera con
        // la consulta previa) — mismo mensaje que ya trae el backend, con más tiempo en pantalla.
        this.snackBar.open(
          mensajeDeError(err, 'No se pudo anular el documento'),
          'Cerrar', { duration: err.status === 409 ? 10000 : 6000, panelClass: err.status === 409 ? ['snackbar-error'] : [] },
        );
      },
    });
  }

  tieneFormasPago(): boolean { return ['FACTURA_COMPRA', 'LIQUIDACION_COMPRA', 'LIQUIDACION_COMPRA_COMPRA'].includes(this.docSeleccionado?.tipoTablaDestino || ''); }

  /** Las retenciones no llevan subtotales ni IVA propios: sólo base y valor retenido. */
  esRetencion(): boolean { return ['RETENCION_COMPRA', 'RETENCION_COMPRA_V2'].includes(this.docSeleccionado?.tipoTablaDestino || ''); }

  esFacturaCompra(): boolean { return this.docSeleccionado?.tipoTablaDestino === 'FACTURA_COMPRA'; }

  /**
   * El historial de abonos (/aplp) aplica a facturas y a liquidaciones de compra — antes solo
   * mostraba la tarjeta para `esFacturaCompra()`, y una liquidación con anticipos cruzados no
   * tenía dónde verlo, aunque el cálculo del backend sí lo tuviera al día.
   */
  esLiquidacionCompra(): boolean {
    return TABLAS_LIQUIDACION.includes(this.docSeleccionado?.tipoTablaDestino || '');
  }

  // ─── HELPERS ──────────────────────────────────────────

  tipoTablaLabel(tabla: string): string {
    const map: Record<string, string> = {
      'FACTURA_COMPRA': 'Factura Compra', 'NOTA_CREDITO_COMPRA': 'Nota Crédito Compra',
      'NOTA_DEBITO_COMPRA': 'Nota Débito Compra',
      'LIQUIDACION_COMPRA': 'Liquidación Compra', 'LIQUIDACION_COMPRA_COMPRA': 'Liquidación Compra',
      'RETENCION_COMPRA': 'Retención Compra', 'RETENCION_COMPRA_V2': 'Retención Compra',
    };
    return map[tabla] || tabla;
  }

  /** Códigos de impuesto del SRI usados en los comprobantes de retención. */
  impuestoLabel(cod: string): string {
    const map: Record<string, string> = { '1': 'Renta', '2': 'IVA', '6': 'ISD' };
    return map[String(cod ?? '').trim()] || cod || '';
  }

  tipoTablaColor(tabla: string): string {
    const map: Record<string, string> = {
      'FACTURA_COMPRA': 'chip-factura', 'NOTA_CREDITO_COMPRA': 'chip-nc',
      'NOTA_DEBITO_COMPRA': 'chip-nd',
      'LIQUIDACION_COMPRA': 'chip-liq', 'LIQUIDACION_COMPRA_COMPRA': 'chip-liq',
      'RETENCION_COMPRA': 'chip-ret', 'RETENCION_COMPRA_V2': 'chip-ret',
    };
    return map[tabla] || '';
  }

  toDate(value: any): Date | null {
    if (!value) return null;
    if (Array.isArray(value)) { const [y, mo, d, h = 0, m = 0, s = 0] = value as number[]; return new Date(y, mo - 1, d, h, m, s); }
    const d = new Date(value); return isNaN(d.getTime()) ? null : d;
  }

  capturarFiltroFechaDesdeRaw(event: Event): void {
    this._rawFiltroFechaDesde = (event.target as HTMLInputElement).value;
  }

  syncFiltroFechaDesdeFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFiltroFechaDesde || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFiltroFechaDesde = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.filtroFechaDesdeControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.filtroFechaDesdeInputRef?.nativeElement) this.filtroFechaDesdeInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFiltroFechaDesdePickerChange(date: Date | null | undefined): void {
    this.filtroFechaDesdeControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.filtroFechaDesdeInputRef?.nativeElement) this.filtroFechaDesdeInputRef.nativeElement.value = formatted;
    });
  }

  capturarFiltroFechaHastaRaw(event: Event): void {
    this._rawFiltroFechaHasta = (event.target as HTMLInputElement).value;
  }

  syncFiltroFechaHastaFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFiltroFechaHasta || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFiltroFechaHasta = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.filtroFechaHastaControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.filtroFechaHastaInputRef?.nativeElement) this.filtroFechaHastaInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFiltroFechaHastaPickerChange(date: Date | null | undefined): void {
    this.filtroFechaHastaControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.filtroFechaHastaInputRef?.nativeElement) this.filtroFechaHastaInputRef.nativeElement.value = formatted;
    });
  }

  private strFecha(val: any): string {
    if (!val) return '';
    if (Array.isArray(val)) { const [y, mo, d] = val as number[]; return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
    return String(val).substring(0, 10);
  }
}

