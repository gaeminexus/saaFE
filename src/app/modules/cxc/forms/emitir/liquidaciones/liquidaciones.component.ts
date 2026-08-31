import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { PortapapelesService } from '../../../../../shared/services/portapapeles.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { FileService } from '../../../../../shared/services/file.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { MovimientoRelacionado } from '../../../../../shared/model/pagos-cobros/movimiento-relacionado';
import { Usuario } from '../../../../../shared/model/usuario';
import {
  AnularDocumentoCompraDialogComponent,
  AnularDocumentoCompraDialogResult,
} from '../../../../cxp/forms/procesos/dialogs/anular-documento-compra-dialog/anular-documento-compra-dialog.component';
import { GrupoProductoSelectorDialogComponent } from '../../../../../shared/components/grupo-producto-selector-dialog/grupo-producto-selector-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { DetalleLiquidacionEmitir } from '../../../model/detalle-liquidacion-emitir';
import { DetalleSri } from '../../../model/detalle-sri';
import { Facturador } from '../../../model/facturador';
import { LiquidacionEmitir } from '../../../model/liquidacion-emitir';
import { PathLiquidacionCompra } from '../../../model/path-liquidacion-compra';
import { PuntoEmision } from '../../../model/puntos-emision';
import { DetalleLiquidacionEmitirService } from '../../../service/emitir/detalle-liquidacion-emitir.service';
import {
  LiquidacionEmitirService,
  ResultadoProcesoLiquidacion,
} from '../../../service/emitir/liquidacion-emitir.service';
import { PathLiquidacionCompraService } from '../../../service/emitir/path-liquidacion-compra.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';
import { FacturadorService } from '../../../service/facturador.service';
import { PuntoEmisionService } from '../../../service/punto-emision.service';
import { Titular } from '../../../../tsr/model/titular';
import { GrupoProductoPago } from '../../../../cxp/model/grupo_producto_pago';
import { ProductoPago } from '../../../../cxp/model/producto_pago';
import { GrupoProductoPagoService } from '../../../../cxp/service/grupo-producto-pago.service';
import { ProductoPagoService } from '../../../../cxp/service/producto-pago.service';

const IVA_GENERAL = '614';
const TABLA_IVA = '17';
const TABLA_FORMA_PAGO_INTERNA = '612';
const TABLA_FORMA_PAGO_SRI = '24';
const LIQUIDACION_COMPRA = '03';
const FECHA_CAMBIO_IVA = new Date('2024-04-01');
const SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO = '01';
const EFECTIVO = '1';
/** Rubro CXC de estadoEmision (mismo ciclo que Factura): 0/6 no válidos, 1 ingresada, 3 firmada, 4 enviada, 5 autorizada. */
const ESTADO_EMISION_AUTORIZADA = 5;
/** Estado (no estadoEmision) del documento: 1 activo, 0 inactivo/anulado. */
const ESTADO_ANULADO = 0;

@Component({
  selector: 'app-liquidaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './liquidaciones.component.html',
  styleUrl: './liquidaciones.component.scss',
})
export class LiquidacionesComponent implements OnInit {
  @ViewChild('fechaLiquidacionInput', { read: ElementRef }) fechaLiquidacionInputRef!: ElementRef<HTMLInputElement>;

  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private portapapeles = inject(PortapapelesService);
  private jasperReportes = inject(JasperReportesService);
  private router = inject(Router);
  private fileService = inject(FileService);
  private service = inject(LiquidacionEmitirService);
  private appState = inject(AppStateService);
  private detalleService = inject(DetalleLiquidacionEmitirService);
  private pathService = inject(PathLiquidacionCompraService);
  private facturadorService = inject(FacturadorService);
  private puntoEmisionService = inject(PuntoEmisionService);
  private detalleSriService = inject(DetalleSriService);
  private grupoProductoS = inject(GrupoProductoPagoService);
  private productoPagoS = inject(ProductoPagoService);
  private funcionesDatosS = inject(FuncionesDatosService);

  cargando = signal(false);
  guardando = signal(false);
  cargandoDetalle = signal(false);
  procesandoAccion = signal(false);
  personaSeleccionada = signal<Titular | null>(null);
  registros = signal<LiquidacionEmitir[]>([]);
  documentoActual = signal<LiquidacionEmitir | null>(null);
  /** Último resultado de procesarCompleta o de una acción de recuperación: trae etapa/advertencias que mostrar. */
  resultadoProceso = signal<ResultadoProcesoLiquidacion | null>(null);
  /** Rutas de XML/RIDE de la liquidación actual, cargadas bajo demanda. */
  pathsDocumento = signal<PathLiquidacionCompra[]>([]);
  textoTitularSeleccionado = computed(() => this.displayPersona(this.personaSeleccionada()));

  // ── Clasificación por producto (catálogo de CXP: ver comentario en el modelo) ──
  gruposProducto = signal<GrupoProductoPago[]>([]);
  private todosLosProductosPago = signal<ProductoPago[]>([]);
  grupoSeleccionado: GrupoProductoPago | null = null;
  productoSeleccionado = signal<ProductoPago | null>(null);
  textoProductoSeleccionado = computed(() => {
    const producto = this.productoSeleccionado();
    return producto ? `${producto.codigo} - ${producto.nombre}` : '';
  });

  /**
   * Una liquidación de compra la emite la empresa hacia un PROVEEDOR (es una
   * compra, no una venta) — no hay tabla de proveedores en este modelo, es un
   * Titular con ese rol asignado vía PersonaRol. Mismo filtro que usa el
   * selector de beneficiario en registro-egreso.
   */
  readonly rolProveedorCodigo = 2;
  readonly rolProveedorNombre = 'PROVEEDOR';
  readonly documentoNombre = 'Liquidación en compras';

  columnasRegistros = ['id', 'fecha', 'numero', 'persona', 'total', 'estado', 'estadoEmision', 'acciones'];
  columnasDetalle = ['cantidad', 'descripcion', 'producto', 'valor', 'subtotal', 'descuento', 'base', 'iva', 'total', 'acciones'];
  dataSourceRegistros = new MatTableDataSource<LiquidacionEmitir>([]);
  dataSourceDetalle = new MatTableDataSource<DetalleLiquidacionEmitir>([]);

  vFacturador = {} as Facturador;
  vUsuario = { codigo: 0 } as Usuario;
  ptosEmision: PuntoEmision[] = [];
  ptoEmision: PuntoEmision | null = null;
  tablaSRIIVAGral: DetalleSri[] = [];
  ivaOpciones: DetalleSri[] = [];
  tablaSRIFormasPago: DetalleSri[] = [];
  tablaSRIFormasPagoInternas: DetalleSri[] = [];
  formaPagoSri: DetalleSri | null = null;
  formaPagoInterna: DetalleSri | null = null;

  registroId: number | null = null;
  fechaControl = new UntypedFormControl(new Date());
  observacion = '';
  plazoPago = 1;
  detalleDescripcion = '';
  detalleCantidad = 1;
  detalleValor = 0;
  detalleDescuento = 0;
  detalleIncluyeIva = false;
  detalleTextoLibre = '';
  listaDetalles: DetalleLiquidacionEmitir[] = [];
  detalleDocumento: DetalleLiquidacionEmitir[] = [];

  nmIvaGral = 15;
  nmCodigoIVASRI = 0;
  lbIvaGral = '15';
  subtotalGravado = 0;
  subtotalCero = 0;
  totalDescuento = 0;
  totalIva = 0;
  totalDocumento = 0;

  /** El producto del catálogo de CXP no trae grupo resuelto (para eso está `productosDelGrupo`, ya filtrado). */
  get productosDelGrupo(): ProductoPago[] {
    const idGrupo = this.grupoSeleccionado?.codigo;
    if (!idGrupo) return [];
    return this.todosLosProductosPago().filter(
      (p) => p.grupoProducto?.codigo === idGrupo && p.estado === 1
    );
  }

  etiquetaGrupo(grupo: GrupoProductoPago | null): string {
    if (!grupo) return '';
    const cuenta = grupo.planCuenta?.cuentaContable?.trim();
    const nombre = String(grupo.nombre ?? '');
    return cuenta ? `${cuenta} — ${nombre}` : nombre;
  }

  /** true cuando toda línea agregada tiene producto clasificado; se exige antes de emitir. */
  get todasLasLineasClasificadas(): boolean {
    return this.listaDetalles.length > 0 && this.listaDetalles.every((d) => !!d.producto);
  }

  ngOnInit(): void {
    this.cargarSesion();
    this.setFecha();
    this.cargarCatalogos();
    this.cargarCatalogosProducto();
    this.cargarFacturadorYPtoEmision();
    this.cargarRegistros();
  }

  get accionPrincipal(): string {
    return this.registroId ? 'Actualizar liquidación' : 'Emitir liquidación';
  }

  recargar(): void {
    this.cargarRegistros();
  }

  cargarRegistros(): void {
    this.cargando.set(true);
    this.service.getAll().subscribe({
      next: (data) => {
        const registros = data || [];
        this.registros.set(registros);
        this.dataSourceRegistros.data = registros;
        this.cargando.set(false);
      },
      error: () => {
        this.mostrarError('No se pudieron cargar las liquidaciones');
        this.cargando.set(false);
      },
    });
  }

  private cargarCatalogosProducto(): void {
    this.grupoProductoS.getAll().subscribe({
      next: (data) => this.gruposProducto.set((data ?? []).filter((g) => g.estado === 1)),
      error: () => this.gruposProducto.set([]),
    });
    this.productoPagoS.getAll().subscribe({
      next: (data) => this.todosLosProductosPago.set(data ?? []),
      error: () => this.todosLosProductosPago.set([]),
    });
  }

  buscaProveedor(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: {
        rolCodigo: this.rolProveedorCodigo,
        rolNombre: this.rolProveedorNombre,
        titulo: 'Buscar Proveedor',
      },
    });

    dialogRef.afterClosed().subscribe((persona: Titular | null) => {
      if (persona) {
        this.asignaTitular(persona);
      }
    });
  }

  /** Grupo primero (cuenta contable + nombre); el producto se elige dentro del grupo, la lista completa es muy larga. */
  buscarGrupoProducto(): void {
    this.dialog.open(GrupoProductoSelectorDialogComponent, {
      width: '760px',
      maxWidth: '98vw',
      data: { grupos: this.gruposProducto() },
    }).afterClosed().subscribe((grupo) => {
      if (!grupo) return;
      this.grupoSeleccionado = grupo as GrupoProductoPago;
      this.productoSeleccionado.set(null);
    });
  }

  onProductoSeleccionadoChange(producto: ProductoPago | null): void {
    if (producto) {
      this.asignaProducto(producto);
    }
  }

  asignaTitular(persona: Titular): void {
    this.personaSeleccionada.set(persona);
  }

  asignaProducto(producto: ProductoPago): void {
    this.productoSeleccionado.set(producto);
    this.detalleDescripcion = producto.nombre || '';
    this.detalleTextoLibre = producto.nombre || '';
    this.detalleValor = Number(producto.precioUnitario || 0);
    this.detalleDescuento = Number(producto.descuento || 0);
    this.detalleIncluyeIva = Number(producto.incluyeIVA) === 1;
  }

  displayPersona(persona: Titular | null): string {
    if (!persona) {
      return '';
    }
    return `${persona.identificacion || ''} - ${persona.razonSocial || persona.nombre || ''}`.trim();
  }

  nuevo(): void {
    this.registroId = null;
    this.documentoActual.set(null);
    this.resultadoProceso.set(null);
    this.pathsDocumento.set([]);
    this.detalleDocumento = [];
    this.detalleCantidad = 1;
    this.detalleValor = 0;
    this.detalleDescuento = 0;
    this.detalleDescripcion = '';
    this.detalleTextoLibre = '';
    this.detalleIncluyeIva = false;
    this.productoSeleccionado.set(null);
    this.grupoSeleccionado = null;
    this.observacion = '';
    this.plazoPago = 1;
    this.listaDetalles = [];
    this.dataSourceDetalle.data = [];
    this.limpiarTitular();
    this.setFecha();
    this.aplicarIvaGeneralPorFecha();
    this.calcularTotales();
  }

  cargarDocumento(registro: LiquidacionEmitir): void {
    this.registroId = registro.id;
    this.documentoActual.set(registro);
    this.resultadoProceso.set(null);
    this.pathsDocumento.set([]);
    this.asignaTitular(registro.titular || null as unknown as Titular);
    this.fechaControl.setValue(this.formatearFechaInput(registro.fecha) || new Date(), { emitEvent: false });
    this.observacion = registro.observacion || '';
    this.ptoEmision = registro.ptoEmision || this.ptoEmision;
    this.cargandoDetalle.set(true);

    forkJoin({
      detalles: registro.id ? this.detalleService.selectByCriteria({ liquidacion: { id: registro.id } }) : of([]),
    }).subscribe({
      next: ({ detalles }) => {
        this.listaDetalles = [...(detalles || [])];
        this.detalleDocumento = [...this.listaDetalles];
        this.dataSourceDetalle.data = [...this.listaDetalles];
        this.calcularTotales();
        this.cargandoDetalle.set(false);
      },
      error: () => {
        this.listaDetalles = [];
        this.dataSourceDetalle.data = [];
        this.calcularTotales();
        this.cargandoDetalle.set(false);
        this.mostrarError('No se pudo cargar el detalle de la liquidación');
      },
    });
  }

  limpiarTitular(): void {
    this.personaSeleccionada.set(null);
  }

  setFecha(): void {
    this.fechaControl.setValue(new Date(), { emitEvent: false });
  }

  private _rawFecha: string = '';

  capturarFechaRaw(event: Event): void {
    this._rawFecha = (event.target as HTMLInputElement).value;
  }

  syncFechaFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFecha || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFecha = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.fechaControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaLiquidacionInputRef?.nativeElement) this.fechaLiquidacionInputRef.nativeElement.value = formatted;
          this.validaIVAByCambioFecha();
        });
      }
    }
  }

  onFechaPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.fechaControl.setValue(d, { emitEvent: false });
    const formatted = this.funcionesDatosS.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaLiquidacionInputRef?.nativeElement) this.fechaLiquidacionInputRef.nativeElement.value = formatted;
    });
    this.validaIVAByCambioFecha();
  }

  validaIVAByCambioFecha(): void {
    this.aplicarIvaGeneralPorFecha();
    this.calcularTotales();
  }

  addDetalle(): void {
    if (!this.productoSeleccionado()) {
      this.mostrarError('Debe seleccionar un producto');
      return;
    }

    if (!this.detalleDescripcion.trim()) {
      this.mostrarError('Ingrese la descripción del detalle');
      return;
    }

    if (this.detalleCantidad <= 0 || this.detalleValor <= 0) {
      this.mostrarError('Cantidad y valor deben ser mayores que 0');
      return;
    }

    const porcentajeIva = this.detalleIncluyeIva ? this.nmIvaGral : 0;
    let valorUnitario = this.redondear(this.detalleValor, 4);
    if (this.detalleIncluyeIva && porcentajeIva > 0) {
      valorUnitario = this.redondear(valorUnitario / (1 + porcentajeIva / 100), 4);
    }

    const subTotal = this.redondear(valorUnitario * this.detalleCantidad);
    const descuento = this.redondear(this.detalleDescuento);
    const baseImponible = this.redondear(Math.max(subTotal - descuento, 0));
    const valorIva = this.redondear(baseImponible * porcentajeIva / 100);

    const item = {
      id: null as unknown as number,
      liquidacion: {} as LiquidacionEmitir,
      descripcion: this.detalleTextoLibre.trim() || this.detalleDescripcion.trim(),
      cantidad: this.redondear(this.detalleCantidad),
      valor: valorUnitario,
      subTotal,
      porcentajeIVA: porcentajeIva,
      valorIVA: valorIva,
      porcentajeICE: 0,
      valorICE: 0,
      subsidio: 0,
      precioSinSub: 0,
      descuento,
      total: this.redondear(baseImponible + valorIva),
      producto: this.productoSeleccionado(),
      estado: 1,
      baseImponible,
    } as DetalleLiquidacionEmitir & { baseImponible?: number };

    this.listaDetalles.push(item);
    this.dataSourceDetalle.data = [...this.listaDetalles];
    this.limpiarDetalle();
    this.calcularTotales();
  }

  eliminaDetalle(item: DetalleLiquidacionEmitir): void {
    this.listaDetalles = this.listaDetalles.filter((detalle) => detalle !== item);
    this.dataSourceDetalle.data = [...this.listaDetalles];
    this.calcularTotales();
  }

  /** Nombre a mostrar en la fila de detalle: grupo + producto, o "Sin clasificar" si falta. */
  etiquetaProductoDetalle(item: DetalleLiquidacionEmitir): string {
    const p = item.producto as ProductoPago | null;
    if (!p) return 'Sin clasificar';
    const grupo = p.grupoProducto?.nombre ? String(p.grupoProducto.nombre) : '';
    return grupo ? `${grupo} · ${p.nombre}` : p.nombre;
  }

  guardar(): void {
    if (!this.personaSeleccionada()?.codigo) {
      this.mostrarError('Seleccione un proveedor válido');
      return;
    }

    if (!this.ptoEmision?.id) {
      this.mostrarError('No existe punto de emisión configurado');
      return;
    }

    if (this.listaDetalles.length < 1) {
      this.mostrarError('Debe registrar al menos un detalle');
      return;
    }

    if (!this.todasLasLineasClasificadas) {
      this.mostrarError('Clasifique todas las líneas');
      return;
    }

    if (!this.formaPagoSri) {
      this.mostrarError('Seleccione la forma de pago SRI');
      return;
    }

    const titular = this.personaSeleccionada() as Titular;
    const fecha = this.parseFechaLocal(this.fechaControl.value);

    const liquidacionCompra: Partial<LiquidacionEmitir> = {
      id: this.registroId || undefined,
      tipoComprobante: LIQUIDACION_COMPRA,
      facturador: this.vFacturador,
      titular,
      tipoDoc: LIQUIDACION_COMPRA,
      numero: this.documentoActual()?.numero || '',
      numEstablecimiento: this.ptoEmision.establecimiento?.codigo || '',
      numPtoEmision: this.ptoEmision.codigo || '',
      secuencial: this.documentoActual()?.secuencial || '',
      ambiente: this.vFacturador.ambiente ?? 1,
      clave: this.documentoActual()?.clave || '',
      fecha: this.formatearFechaLocalDateTime(fecha) as unknown as Date,
      observacion: this.observacion,
      subtotal: this.subtotalGravado,
      subcero: this.subtotalCero,
      pIVA: this.nmIvaGral,
      vIVA: this.totalIva,
      vICE: 0,
      vIRBPNR: 0,
      descuento: this.totalDescuento,
      porDescuento: 0,
      propina: 0,
      subsidio: 0,
      totalSinSub: 0,
      ahorroSub: 0,
      total: this.totalDocumento,
      ptoEmision: this.ptoEmision,
      usuario: this.vUsuario,
      pathGen: this.documentoActual()?.pathGen || '',
      autorizacion: this.documentoActual()?.autorizacion || '',
      fechaAutorizacion: this.documentoActual()?.fechaAutorizacion || '',
      estado: 1,
      estadoEmision: 1,
    };

    // El backend exige `producto` con `grupoProducto.planCuenta` ya resuelto (no hace un
    // SELECT adicional antes de validar) — se manda el objeto completo tal como lo carga
    // ProductoPagoService.getAll(), no solo {id}.
    const detalles = this.listaDetalles.map((item) => ({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      valor: item.valor,
      subTotal: item.subTotal,
      porcentajeIVA: item.porcentajeIVA,
      valorIVA: item.valorIVA,
      porcentajeICE: item.porcentajeICE,
      valorICE: item.valorICE,
      subsidio: item.subsidio,
      precioSinSub: item.precioSinSub,
      descuento: item.descuento,
      total: item.total,
      producto: item.producto,
      estado: 1,
    }));

    const formasPago = [
      {
        formaPago: this.formaPagoSri.codigo,
        valor: this.totalDocumento,
        plazo: this.plazoPago,
        unidadTiempo: 'dias',
      },
    ];

    this.guardando.set(true);
    this.resultadoProceso.set(null);

    // finalize() garantiza que guardando vuelva a false pase lo que pase —
    // éxito, error con body JSON, error sin body parseable, o excepción en
    // los propios manejadores — en vez de depender de duplicar el set(false)
    // en next/error (que antes dejaba el botón colgado si algo entre medio fallaba).
    this.service.procesarCompleta({ liquidacionCompra, detalles, formasPago })
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (resultado) => {
          this.resultadoProceso.set(resultado);
          this.registroId = resultado.idLiquidacion || this.registroId;

          if (resultado.etapa === 'COMPLETADO_CON_PENDIENTES') {
            this.mostrarAdvertencia(resultado.mensaje || 'Liquidación autorizada, pero quedaron etapas pendientes. Revise las advertencias.');
          } else {
            this.mostrarExito(resultado.mensaje || 'Liquidación autorizada correctamente');
          }

          if (resultado.idLiquidacion) {
            this.service.getById(String(resultado.idLiquidacion)).subscribe({
              next: (completa) => {
                if (completa?.id) this.documentoActual.set(completa);
              },
            });
          }
          this.cargarRegistros();
        },
        error: (err) => {
          const cuerpo = this.extraerResultado(err);
          this.resultadoProceso.set(cuerpo ?? null);
          this.mostrarError(this.mensajeDeResultado(err, 'No se pudo procesar la liquidación'));
        },
      });
  }

  /**
   * Acepta tanto el HttpErrorResponse crudo (procesarCompleta no tiene
   * catchError — ver el servicio) como un `ResultadoProcesoLiquidacion` ya
   * desenvuelto (p.ej. una respuesta 200 con `exito:false`), sin que el
   * llamador tenga que saber cuál de las dos formas está pasando.
   */
  private extraerResultado(valorCrudo: unknown): ResultadoProcesoLiquidacion | undefined {
    if (!valorCrudo || typeof valorCrudo !== 'object') return undefined;
    const conError = valorCrudo as { error?: unknown };
    if (conError.error && typeof conError.error === 'object') {
      return conError.error as ResultadoProcesoLiquidacion;
    }
    const candidato = valorCrudo as ResultadoProcesoLiquidacion;
    if ('etapa' in candidato || 'mensaje' in candidato || 'exito' in candidato) {
      return candidato;
    }
    return undefined;
  }

  /**
   * Para VALIDACION_CONTABLE arma un detalle con la lista de cuentas
   * faltantes; para cualquier otro caso (incluido un 500 sin body JSON
   * parseable, p.ej. falla de firma electrónica) delega en el helper
   * compartido, que ya sabe leer `.error.mensaje`, `.error` como string
   * plano, o el `.message` genérico de Angular.
   */
  private mensajeDeResultado(valorCrudo: unknown, fallback: string): string {
    const resultado = this.extraerResultado(valorCrudo);
    if (resultado?.etapa === 'VALIDACION_CONTABLE' && Array.isArray(resultado.erroresContables) && resultado.erroresContables.length) {
      return `Faltan cuentas contables configuradas:\n${resultado.erroresContables.map((e) => `• ${e}`).join('\n')}`;
    }
    return mensajeDeError(valorCrudo, fallback);
  }

  eliminar(registro: LiquidacionEmitir): void {
    if (!registro.id) {
      return;
    }

    this.service.delete(registro.id).subscribe({
      next: () => {
        this.mostrarExito('Liquidación eliminada');
        this.cargarRegistros();
      },
      error: () => this.mostrarError('No se pudo eliminar la liquidación'),
    });
  }

  // ═══ ACCIONES SOBRE LA LIQUIDACIÓN ACTUAL (ya emitida) ═════════════════

  puedeCrearDocumentoCxp(): boolean {
    const doc = this.documentoActual();
    return !!doc?.id && Number(doc.estadoEmision) === ESTADO_EMISION_AUTORIZADA && !doc.documentoCxp;
  }

  puedeAnular(): boolean {
    const doc = this.documentoActual();
    return !!doc?.id && Number(doc.estado) !== ESTADO_ANULADO;
  }

  puedeEmitirRetencion(): boolean {
    const doc = this.documentoActual();
    return !!doc?.id && Number(doc.estadoEmision) === ESTADO_EMISION_AUTORIZADA;
  }

  reintentarAutorizacion(): void {
    const id = this.documentoActual()?.id;
    if (!id) return;
    this.procesandoAccion.set(true);
    this.service.reintentarAutorizacion(id)
      .pipe(finalize(() => this.procesandoAccion.set(false)))
      .subscribe({
        next: (resultado) => this.aplicarResultadoAccion(id, resultado, 'Reintento de autorización procesado'),
        error: (err) => this.errorAccion(err, 'No se pudo reintentar la autorización'),
      });
  }

  consultarEstadoSri(): void {
    const id = this.documentoActual()?.id;
    if (!id) return;
    this.procesandoAccion.set(true);
    this.service.consultarYActualizarEstado(id)
      .pipe(finalize(() => this.procesandoAccion.set(false)))
      .subscribe({
        next: (resultado) => this.aplicarResultadoAccion(id, resultado, 'Estado consultado'),
        error: (err) => this.errorAccion(err, 'No se pudo consultar el estado en el SRI'),
      });
  }

  reenviarEmail(): void {
    const id = this.documentoActual()?.id;
    if (!id) return;
    const correoDefecto = this.personaSeleccionada()?.email || '';
    const ingresado = window.prompt('Ingrese correos separados por ;', correoDefecto);
    if (ingresado === null) return;
    const destinatarios = ingresado.split(';').map((c) => c.trim()).filter((c) => c.length > 0);
    if (!destinatarios.length) {
      this.mostrarError('Debe ingresar al menos un correo');
      return;
    }
    this.procesandoAccion.set(true);
    this.service.reenviarEmail({ idLiquidacion: id, destinatarios: destinatarios.join(';') })
      .pipe(finalize(() => this.procesandoAccion.set(false)))
      .subscribe({
        next: (resultado) => this.aplicarResultadoAccion(id, resultado, 'Reenvío de correo solicitado'),
        error: (err) => this.errorAccion(err, 'No se pudo reenviar el correo'),
      });
  }

  crearDocumentoCxp(): void {
    const id = this.documentoActual()?.id;
    if (!id) return;
    this.procesandoAccion.set(true);
    this.service.crearDocumentoCxp(id)
      .pipe(finalize(() => this.procesandoAccion.set(false)))
      .subscribe({
        next: (resultado) => this.aplicarResultadoAccion(id, resultado, 'Documento CXP creado'),
        error: (err) => this.errorAccion(err, 'No se pudo crear el documento CXP'),
      });
  }

  /**
   * Anulación en cascada (ítem 14, 2026-08-28): a diferencia de `LiquidacionCompraCompra` (cxp,
   * la RECIBIDA de un proveedor, sin nada que cascadear), esta liquidación EMITIDA sí puede
   * tener cobros cruzados — se consultan antes de preguntar y, si los hay, se exige confirmar
   * la cascada explícitamente (si no, el backend responde 409). Reemplaza la advertencia
   * genérica anterior ("no se verifica si ya está pagado") por la verificación real.
   */
  anularLiquidacion(): void {
    const doc = this.documentoActual();
    if (!doc?.id) return;

    this.procesandoAccion.set(true);
    this.service.movimientosRelacionados(doc.id).subscribe({
      next: (movs) => {
        this.procesandoAccion.set(false);
        this.abrirDialogoAnularLiquidacion(doc.id, doc.numero, movs || []);
      },
      error: (err) => {
        this.procesandoAccion.set(false);
        this.errorAccion(err, 'No se pudieron consultar los movimientos relacionados');
      },
    });
  }

  private abrirDialogoAnularLiquidacion(id: number, numero: string | undefined, movimientos: MovimientoRelacionado[]): void {
    this.dialog.open(AnularDocumentoCompraDialogComponent, {
      width: '560px',
      disableClose: true,
      data: { tipoLabel: 'Liquidación', numero: numero || String(id), movimientos },
    }).afterClosed().subscribe((result: AnularDocumentoCompraDialogResult | null) => {
      if (!result) return;
      this.procesandoAccion.set(true);
      this.service.anular({
        idLiquidacion: id,
        motivo: result.motivo,
        usuario: this.nombreUsuarioSesion(),
        idUsuario: this.appState.getIdUsuario(),
        anularEnCascada: result.anularEnCascada,
      })
        .pipe(finalize(() => this.procesandoAccion.set(false)))
        .subscribe({
          next: (resultado) => this.aplicarResultadoAccion(id, resultado, 'Liquidación anulada'),
          error: (err) => this.errorAccion(err, 'No se pudo anular la liquidación'),
        });
    });
  }

  private aplicarResultadoAccion(id: number, resultado: ResultadoProcesoLiquidacion, mensajeExito: string): void {
    this.resultadoProceso.set(resultado);
    if (resultado?.exito === false) {
      this.mostrarError(this.mensajeDeResultado(resultado, 'La operación no se completó'));
    } else {
      this.mostrarExito(resultado?.mensaje || mensajeExito);
    }
    this.service.getById(String(id)).subscribe({
      next: (completa) => {
        if (completa?.id) this.documentoActual.set(completa);
      },
    });
    this.cargarRegistros();
  }

  private errorAccion(err: unknown, fallback: string): void {
    this.mostrarError(this.mensajeDeResultado(err, fallback));
  }

  /** Descarga el XML/RIDE de la liquidación actual (CBR.PTLC). Carga la lista si aún no se pidió. */
  descargarRideXml(): void {
    const id = this.documentoActual()?.id;
    if (!id) return;

    if (this.pathsDocumento().length) {
      this.abrirDescargas(this.pathsDocumento());
      return;
    }

    this.pathService.selectByCriteria({ liquidacion: { id } }).subscribe({
      next: (paths) => {
        const lista = paths ?? [];
        this.pathsDocumento.set(lista);
        if (!lista.length) {
          this.mostrarError('No hay archivos generados para esta liquidación todavía');
          return;
        }
        this.abrirDescargas(lista);
      },
      error: () => this.mostrarError('No se pudo consultar los archivos de la liquidación'),
    });
  }

  private abrirDescargas(paths: PathLiquidacionCompra[]): void {
    paths.forEach((p) => {
      if (!p.path) return;
      const nombre = p.path.split('/').pop() || `liquidacion-${this.documentoActual()?.id}`;
      this.fileService.downloadAndSaveFile(p.path, nombre);
    });
  }

  /**
   * "Emitir retención" desde una liquidación autorizada: navega a Retención V2
   * con el sustento precargado (tipo 03 = liquidación de compra). La pantalla
   * de destino lee estos query params en su ngOnInit (cambio mínimo allí).
   */
  emitirRetencion(): void {
    const doc = this.documentoActual();
    if (!doc?.id || !this.puedeEmitirRetencion()) return;

    const numeroCompleto = doc.numero
      || [doc.numEstablecimiento, doc.numPtoEmision, doc.secuencial].filter(Boolean).join('-');

    this.router.navigate(['/menucuentasxcobrar/emitir/retenciones-v2'], {
      queryParams: {
        codDocSustento: LIQUIDACION_COMPRA,
        numDocSustento: numeroCompleto,
        fechaEmisionDocSustento: this.aFechaISOFecha(doc.fecha),
        idProveedor: doc.titular?.codigo ?? '',
      },
    });
  }

  private aFechaISOFecha(fecha: any): string {
    const d = this.funcionesDatosS.convertirFechaDesdeBackend(fecha) || new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Imprime el RIDE — el PDF oficial del comprobante, generado por Jasper.
   *
   * Hasta el 2026-08-31 este botón imprimía el `innerHTML` de la vista previa en pantalla
   * (`#ticket-liquidacion`), que **no es el RIDE**: es una maqueta del formulario, sin el
   * formato ni los datos que el SRI exige en la representación impresa. El RIDE real ya se
   * generaba en el backend al emitir (`LiquidacionCompraServiceImpl.generarPDFLiquidacion`,
   * plantilla `RPRT_RIDE_LIQUIDACION`), pero sólo se adjuntaba al correo — no había forma de
   * pedirlo desde la pantalla.
   *
   * Mismo patrón que `facturas-ingreso.imprimeFactura()`.
   */
  imprimirDocumento(): void {
    const id = this.documentoActual()?.id;
    if (!id) {
      this.mostrarError('Primero debe emitir el documento');
      return;
    }

    this.jasperReportes.generar('cxc', 'RPRT_RIDE_LIQUIDACION', { P_ID_LIQUIDACION: id }, 'PDF').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      error: () => this.mostrarError('No se pudo generar el RIDE de la liquidación'),
    });
  }

  copiarAutorizacion(): void {
    const autorizacion = this.documentoActual()?.autorizacion || this.documentoActual()?.clave;
    if (!autorizacion) {
      this.mostrarError('No existe clave de acceso disponible');
      return;
    }

    this.portapapeles.copiar(autorizacion).then((copiado) => {
      if (copiado) {
        this.mostrarExito('Clave copiada al portapapeles');
      } else {
        this.mostrarError('No se pudo copiar automáticamente. Seleccione la clave y use Ctrl+C.');
      }
    });
  }

  estadoLabel(estado: number | null | undefined): string {
    return Number(estado) === 1 ? 'Activo' : 'Inactivo';
  }

  /** Mismo ciclo de estados SRI que Factura (ver estado-cuenta-titular.service.ts en TSR). */
  estadoEmisionLabel(estadoEmision: number | null | undefined): string {
    switch (Number(estadoEmision)) {
      case 1: return 'Ingresada';
      case 3: return 'Firmada';
      case 4: return 'Enviada';
      case 5: return 'Autorizada';
      case 6: return 'No autorizada';
      case 0: return 'Anulada';
      default: return estadoEmision != null ? `Estado ${estadoEmision}` : '—';
    }
  }

  private cargarSesion(): void {
    const usuarioStr = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        this.vUsuario = JSON.parse(usuarioStr) as Usuario;
      } catch {
        this.vUsuario = { codigo: 0 } as Usuario;
      }
    }

    const facturadorStr = sessionStorage.getItem('facturador') || localStorage.getItem('facturador');
    if (facturadorStr) {
      try {
        this.vFacturador = JSON.parse(facturadorStr) as Facturador;
      } catch {
        this.vFacturador = {} as Facturador;
      }
    }
  }

  private nombreUsuarioSesion(): string {
    try {
      const u = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');
      if (u) {
        const parsed = JSON.parse(u);
        return parsed?.username || parsed?.nombre || parsed?.login || 'sistema';
      }
    } catch { /* ignore */ }
    return 'sistema';
  }

  private cargarFacturadorYPtoEmision(): void {
    if (!this.vFacturador?.id) {
      this.facturadorService.getAll().subscribe({
        next: (facturadores) => {
          const primero = (facturadores || [])[0];
          if (primero) {
            this.vFacturador = primero;
            this.cargarPuntosEmision();
          }
        },
      });
      return;
    }

    this.cargarPuntosEmision();
  }

  private cargarPuntosEmision(): void {
    this.puntoEmisionService.getAll().subscribe({
      next: (puntos) => {
        const activos = (puntos || []).filter((p) => p.estado === 1);
        this.ptosEmision = activos;
        this.ptoEmision = activos[0] || null;
      },
    });
  }

  private cargarCatalogos(): void {
    this.detalleSriService.getAll().subscribe({
      next: (all) => {
        const detalles = (all || []).filter((detalle) => detalle.estado === 1);
        this.ivaOpciones = detalles.filter((detalle) => this.getTablaCodigo(detalle.lsri) === TABLA_IVA);
        this.tablaSRIIVAGral = detalles.filter((detalle) => this.getTablaCodigo(detalle.lsri) === IVA_GENERAL);
        this.tablaSRIFormasPago = detalles.filter((detalle) => this.getTablaCodigo(detalle.lsri) === TABLA_FORMA_PAGO_SRI);
        this.tablaSRIFormasPagoInternas = detalles.filter((detalle) => this.getTablaCodigo(detalle.lsri) === TABLA_FORMA_PAGO_INTERNA);
        this.aplicarIvaGeneralPorFecha();
        this.formaPagoSri = this.tablaSRIFormasPago.find((item) => item.codigo === SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO) || this.tablaSRIFormasPago[0] || null;
        this.formaPagoInterna = this.tablaSRIFormasPagoInternas.find((item) => item.codigo === EFECTIVO) || this.tablaSRIFormasPagoInternas[0] || null;
      },
    });
  }

  private aplicarIvaGeneralPorFecha(): void {
    if (!this.tablaSRIIVAGral.length) {
      return;
    }

    const fechaActual = this.parseFechaLocal(this.fechaControl.value);
    const actual = this.tablaSRIIVAGral.find((item) => fechaActual >= FECHA_CAMBIO_IVA && Number(item.porcentaje) >= 12);
    const anterior = this.tablaSRIIVAGral.find((item) => Number(item.porcentaje) < 12);
    const elegido = fechaActual >= FECHA_CAMBIO_IVA ? actual || this.tablaSRIIVAGral[0] : anterior || this.tablaSRIIVAGral[0];
    this.lbIvaGral = String(elegido.porcentaje || 0);
    this.nmIvaGral = Number(elegido.porcentaje || 0);
    this.nmCodigoIVASRI = Number(elegido.codigo || 0);
  }

  private calcularTotales(): void {
    let subtotalGravado = 0;
    let subtotalCero = 0;
    let totalDescuento = 0;
    let totalIva = 0;

    this.listaDetalles.forEach((item) => {
      const subTotal = this.redondear(Number(item.subTotal || 0));
      const descuento = this.redondear(Number(item.descuento || 0));
      const porcentaje = Number(item.porcentajeIVA || 0);
      const baseImponible = this.redondear((item as DetalleLiquidacionEmitir & { baseImponible?: number }).baseImponible ?? Math.max(subTotal - descuento, 0));
      const valorIva = this.redondear(baseImponible * porcentaje / 100);
      item.subTotal = subTotal;
      item.descuento = descuento;
      item.valorIVA = valorIva;
      item.total = this.redondear(baseImponible + valorIva);

      if (porcentaje > 0) {
        subtotalGravado += baseImponible;
        totalIva += valorIva;
      } else {
        subtotalCero += baseImponible;
      }
      totalDescuento += descuento;
    });

    this.subtotalGravado = this.redondear(subtotalGravado);
    this.subtotalCero = this.redondear(subtotalCero);
    this.totalDescuento = this.redondear(totalDescuento);
    this.totalIva = this.redondear(totalIva);
    this.totalDocumento = this.redondear(this.subtotalGravado + this.subtotalCero + this.totalIva);
    this.dataSourceDetalle.data = [...this.listaDetalles];
  }

  private limpiarDetalle(): void {
    this.productoSeleccionado.set(null);
    this.grupoSeleccionado = null;
    this.detalleDescripcion = '';
    this.detalleTextoLibre = '';
    this.detalleCantidad = 1;
    this.detalleValor = 0;
    this.detalleDescuento = 0;
    this.detalleIncluyeIva = false;
  }

  private formatearFechaInput(fecha: Date | string | null | undefined): Date | null {
    if (!fecha) {
      return null;
    }

    const d = new Date(fecha);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /** LocalDateTime del backend como ISO local sin zona (yyyy-MM-ddTHH:mm:ss), nunca un Date crudo ni "Z". */
  private formatearFechaLocalDateTime(fecha: Date): string {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    const hh = String(fecha.getHours()).padStart(2, '0');
    const mi = String(fecha.getMinutes()).padStart(2, '0');
    const ss = String(fecha.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  private parseFechaLocal(fechaValor: string | Date | null | undefined): Date {
    if (fechaValor instanceof Date) {
      return fechaValor;
    }

    const fechaTexto = String(fechaValor || '').trim();
    if (!fechaTexto) {
      return new Date();
    }

    if (fechaTexto.includes('/')) {
      const [dia, mes, anio] = fechaTexto.split('/').map(Number);
      if (anio && mes && dia) {
        return new Date(anio, mes - 1, dia);
      }
    }

    const [anio, mes, dia] = fechaTexto.split('-').map(Number);
    return new Date(anio, (mes || 1) - 1, dia || 1);
  }

  private getTablaCodigo(lsri: number | { tabla?: string }): string {
    if (typeof lsri === 'object' && lsri?.tabla) {
      return String(lsri.tabla);
    }

    return typeof lsri === 'number' ? String(lsri) : '';
  }

  private redondear(valor: number, decimales = 2): number {
    const factor = 10 ** decimales;
    return Math.round((Number(valor || 0) + Number.EPSILON) * factor) / factor;
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3500,
      panelClass: ['snackbar-success'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  private mostrarAdvertencia(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 7000,
      panelClass: ['snackbar-warning'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 4500,
      panelClass: ['snackbar-error'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
