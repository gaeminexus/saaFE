import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, of } from 'rxjs';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { Usuario } from '../../../../../shared/model/usuario';
import { ProductoSelectorDialogComponent } from '../../../../../shared/components/producto-selector-dialog/producto-selector-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { DetalleLiquidacionEmitir } from '../../../model/detalle-liquidacion-emitir';
import { DetalleSri } from '../../../model/detalle-sri';
import { Facturador } from '../../../model/facturador';
import { FormaPagoFactura } from '../../../model/forma-pago-factura';
import { LiquidacionEmitir } from '../../../model/liquidacion-emitir';
import { ProductoCobro } from '../../../model/producto-cobro';
import { PuntoEmision } from '../../../model/puntos-emision';
import { DetalleLiquidacionEmitirService } from '../../../service/emitir/detalle-liquidacion-emitir.service';
import { LiquidacionEmitirService } from '../../../service/emitir/liquidacion-emitir.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';
import { FacturadorService } from '../../../service/facturador.service';
import { PuntoEmisionService } from '../../../service/punto-emision.service';
import { Titular } from '../../../../tsr/model/titular';

const IVA_GENERAL = '614';
const TABLA_IVA = '17';
const TABLA_FORMA_PAGO_INTERNA = '612';
const TABLA_FORMA_PAGO_SRI = '24';
const LIQUIDACION_COMPRA = '03';
const FECHA_CAMBIO_IVA = new Date('2024-04-01');
const SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO = '01';
const EFECTIVO = '1';

@Component({
  selector: 'app-liquidaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './liquidaciones.component.html',
  styleUrl: './liquidaciones.component.scss',
})
export class LiquidacionesComponent implements OnInit {
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private service = inject(LiquidacionEmitirService);
  private detalleService = inject(DetalleLiquidacionEmitirService);
  private facturadorService = inject(FacturadorService);
  private puntoEmisionService = inject(PuntoEmisionService);
  private detalleSriService = inject(DetalleSriService);
  private funcionesDatosS = inject(FuncionesDatosService);

  cargando = signal(false);
  guardando = signal(false);
  cargandoDetalle = signal(false);
  personaSeleccionada = signal<Titular | null>(null);
  productoSeleccionado = signal<ProductoCobro | null>(null);
  registros = signal<LiquidacionEmitir[]>([]);
  documentoActual = signal<LiquidacionEmitir | null>(null);
  textoTitularSeleccionado = computed(() => this.displayPersona(this.personaSeleccionada()));
  textoProductoSeleccionado = computed(() => {
    const producto = this.productoSeleccionado();
    return producto ? `${producto.codigo} - ${producto.nombre}` : '';
  });
  readonly rolTitularCodigo = 1;
  readonly rolTitularNombre = 'CLIENTE';
  readonly documentoNombre = 'Liquidación en compras';

  columnasRegistros = ['id', 'fecha', 'numero', 'persona', 'total', 'estado', 'acciones'];
  columnasDetalle = ['cantidad', 'descripcion', 'valor', 'subtotal', 'descuento', 'base', 'iva', 'total', 'acciones'];
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
  strFecha: Date | string | null = '';
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

  ngOnInit(): void {
    this.cargarSesion();
    this.setFecha();
    this.cargarCatalogos();
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

  buscaTitular(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: {
        rolCodigo: this.rolTitularCodigo,
        rolNombre: this.rolTitularNombre,
        titulo: 'Buscar Cliente',
      },
    });

    dialogRef.afterClosed().subscribe((persona: Titular | null) => {
      if (persona) {
        this.asignaTitular(persona);
      }
    });
  }

  buscaProducto(): void {
    const dialogRef = this.dialog.open(ProductoSelectorDialogComponent, {
      width: '1200px',
      maxWidth: '98vw',
      data: { titulo: 'Buscar producto para liquidación' },
    });

    dialogRef.afterClosed().subscribe((producto: ProductoCobro | null) => {
      if (producto) {
        this.asignaProducto(producto);
      }
    });
  }

  asignaTitular(persona: Titular): void {
    this.personaSeleccionada.set(persona);
  }

  asignaProducto(producto: ProductoCobro): void {
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
    this.detalleDocumento = [];
    this.detalleCantidad = 1;
    this.detalleValor = 0;
    this.detalleDescuento = 0;
    this.detalleDescripcion = '';
    this.detalleTextoLibre = '';
    this.detalleIncluyeIva = false;
    this.productoSeleccionado.set(null);
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
    this.asignaTitular(registro.titular || null as unknown as Titular);
    this.strFecha = this.formatearFechaInput(registro.fecha);
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
    this.strFecha = new Date();
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
      producto: this.productoSeleccionado() as ProductoCobro,
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

  guardar(): void {
    if (!this.personaSeleccionada()?.codigo) {
      this.mostrarError('Seleccione un cliente válido');
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

    if (!this.formaPagoSri || !this.formaPagoInterna) {
      this.mostrarError('Seleccione las formas de pago requeridas');
      return;
    }

    const titular = this.personaSeleccionada() as Titular;
    const fecha = this.parseFechaLocal(this.strFecha);
    const detalleLiquidacion = this.listaDetalles.map((item) => ({
      ...item,
      liquidacion: { id: this.registroId || 0 } as LiquidacionEmitir,
    }));

    const formaPagosFactura: FormaPagoFactura[] = [
      {
        id: 0,
        factura: {} as any,
        formaPago: this.formaPagoSri.codigo,
        valor: this.totalDocumento,
        plazo: this.plazoPago,
        unidadTiempo: 'dias',
        estado: 1,
      },
    ];

    const payload: Partial<LiquidacionEmitir> & {
      detalleLiquidacion: DetalleLiquidacionEmitir[];
      formaPago?: number;
      formaPagoCodigo?: string;
      plazo?: number;
      formaPagosFactura?: FormaPagoFactura[];
    } = {
      id: this.registroId || undefined,
      tipoComprobante: LIQUIDACION_COMPRA,
      facturador: this.vFacturador,
      titular,
      tipoDoc: '04',
      numero: this.documentoActual()?.numero || '',
      numEstablecimiento: this.ptoEmision.establecimiento?.codigo || '',
      numPtoEmision: this.ptoEmision.codigo || '',
      secuencial: this.documentoActual()?.secuencial || '',
      ambiente: 1,
      clave: this.documentoActual()?.clave || '',
      fecha,
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
      detalleLiquidacion,
      formaPago: Number(this.formaPagoInterna.id || 0),
      formaPagoCodigo: this.formaPagoSri.codigo,
      plazo: this.plazoPago,
      formaPagosFactura,
    };

    this.guardando.set(true);
    const request$ = this.registroId ? this.service.update(payload) : this.service.grabarLiquidacion(payload);
    request$.subscribe({
      next: (respuesta) => {
        this.documentoActual.set(respuesta || null);
        this.registroId = respuesta?.id || this.registroId;
        this.guardando.set(false);
        this.mostrarExito('Liquidación procesada correctamente');
        this.cargarRegistros();
      },
      error: (error) => {
        this.guardando.set(false);
        this.mostrarError(this.parseError(error, 'No se pudo procesar la liquidación'));
      },
    });
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

  imprimirDocumento(): void {
    const contenido = document.getElementById('ticket-liquidacion')?.innerHTML;
    if (!contenido) {
      this.mostrarError('No existe contenido para imprimir');
      return;
    }

    const ventana = window.open('', '_blank');
    if (!ventana) {
      this.mostrarError('No se pudo abrir la ventana de impresión');
      return;
    }

    ventana.document.write(contenido);
    ventana.document.close();
    ventana.focus();
    ventana.print();
    ventana.close();
  }

  copiarAutorizacion(): void {
    const autorizacion = this.documentoActual()?.autorizacion || this.documentoActual()?.clave;
    if (!autorizacion) {
      this.mostrarError('No existe clave de acceso disponible');
      return;
    }

    navigator.clipboard.writeText(autorizacion).then(() => {
      this.mostrarExito('Clave copiada al portapapeles');
    });
  }

  estadoLabel(estado: number | null | undefined): string {
    return Number(estado) === 1 ? 'Activo' : 'Inactivo';
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

    const fechaActual = this.parseFechaLocal(this.strFecha);
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

  private parseError(error: unknown, fallback: string): string {
    if (!error) {
      return fallback;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error && 'message' in error) {
      return String((error as { message?: unknown }).message || fallback);
    }

    return fallback;
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3500,
      panelClass: ['snackbar-success'],
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
