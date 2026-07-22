import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FacturaEmitir } from '../../../model/factura-emitir';
import { DetalleFacturaEmitir } from '../../../model/detalle-factura-emitir';
import { Facturador } from '../../../model/facturador';
import { PuntoEmision } from '../../../model/puntos-emision';
import { ProductoCobro } from '../../../model/producto-cobro';
import { DetalleSri } from '../../../model/detalle-sri';
import { Titular } from '../../../../tsr/model/titular';
import { Usuario } from '../../../../../shared/model/usuario';
import { FacturaEmitirService } from '../../../service/emitir/factura-emitir.service';
import { PersonaClienteEmitirService } from '../../../service/emitir/persona-cliente-emitir.service';
import { FacturadorService } from '../../../service/facturador.service';
import { PuntoEmisionService } from '../../../service/punto-emision.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { ProductoSelectorDialogComponent } from '../../../../../shared/components/producto-selector-dialog/producto-selector-dialog.component';

const IVA_GENERAL = '614';
const FECHA_CAMBIO_IVA = new Date('2024-04-01');
const FACTURA = '01';
const TABLA_IVA = '17';
const SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO = '01';
const TABLA_FORMA_PAGO_INTERNA = '612';
const TABLA_FORMA_PAGO = '24';
const EFECTIVO = '1';

@Component({
  selector: 'app-facturas-ingreso',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './facturas-ingreso.component.html',
  styleUrl: './facturas-ingreso.component.scss',
})
export class FacturasIngresoComponent implements OnInit {
  @ViewChild('inCantidad') inCantidad!: ElementRef;
  @ViewChild('fechaFacturaInput', { read: ElementRef }) fechaFacturaInputRef!: ElementRef<HTMLInputElement>;

  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private facturaService = inject(FacturaEmitirService);
  private personaClienteService = inject(PersonaClienteEmitirService);
  private facturadorService = inject(FacturadorService);
  private puntoEmisionService = inject(PuntoEmisionService);
  private detalleSriService = inject(DetalleSriService);
  private jasperReportes = inject(JasperReportesService);
  public funcionesDatosS = inject(FuncionesDatosService);

  cargando = signal(false);
  guardando = signal(false);

  areaIzq = 'area-izq-borde';
  areaDer = 'area-der';
  cabeceraDatos = 'cabecera-datos';
  altura = { height: 'calc(100vh - 120px)' };
  vertical = false;
  letraFcdr = '0.80em';
  anchoIngreso = '76%';
  campoCmdr = 'doble';
  vItem = 'item';

  vFactura: FacturaEmitir | null = null;
  vFacturador = {} as Facturador;
  vUsuario = { codigo: 0 } as Usuario;
  vEmpresaCodigo = 0;
  vComprador = {} as Titular;
  txtComprador = '';
  txtDireccion = '';
  txtTelefono = '';
  txtObservacion = '';
  txtProducto: string | null = null;
  txtProductoTrans = '';
  txtCantidad = 0;
  txtValor = 0;
  txtTotal = 0;
  txtDescuento = 0;
  txtPorDescuento = 0;
  txtPropina = 0;
  txtDescuentoDetalle = 0;
  productoSeleccionado = signal<ProductoCobro | null>(null);
  textoProductoSeleccionado = computed(() => {
    const producto = this.productoSeleccionado();
    if (!producto) {
      return '';
    }

    return `${producto.codigo} - ${producto.nombre}`;
  });

  lbSubtotal = 0;
  lbSubtotal5 = 0;
  lbSubtotal8 = 0;
  lbIVACero = 0;
  lbTotalIVA = 0;
  lbTotalIVA5 = 0;
  lbTotalIVA8 = 0;
  lbTotal = 0;
  lbIvaGral = '15';
  nmIvaGral = 15;
  nmCodigoIVASRI = 0;

  lbIncluyeIva = '';
  lbTipoIva = '';
  lbTipoDescuento = '';

  chkIvaCero = false;
  chkIncluye = false;
  deshabilitado = false;
  listadoPagos = false;

  vLogo = '';
  vAmbiente = 'PRUEBAS';
  fechaControl = new UntypedFormControl(new Date());

  txtCIRUC = new UntypedFormControl('', [Validators.required, Validators.minLength(10)]);
  txteMail = new UntypedFormControl('', [Validators.required, Validators.email]);

  ptosEmision: PuntoEmision[] = [];
  ptoEmision!: PuntoEmision;

  ivaOpciones: DetalleSri[] = [];
  tablaSRIIVAGral: DetalleSri[] = [];
  tablaSRIFormasPago: DetalleSri[] = [];
  tablaSRIFormasPagoInternas: DetalleSri[] = [];
  formaPagoFactura!: DetalleSri;
  formaPagoFacturaOtro!: DetalleSri;
  plazoPago = 1;

  listaDetFactura: DetalleFacturaEmitir[] = [];
  dataSource = new MatTableDataSource<DetalleFacturaEmitir>([]);
  columnas = ['cantidad', 'descripcion', 'valor', 'subTotal', 'descuento', 'baseImponible', 'acciones'];

  personasCliente = signal<Titular[]>([]);
  personaSeleccionada = signal<Titular | null>(null);
  readonly rolClienteCodigo = 1;

  @HostListener('window:resize')
  onResize(): void {
    this.responsive(window.innerWidth);
  }

  ngOnInit(): void {
    this.cargarSesion();
    this.setFecha();
    this.responsive(window.innerWidth);
    this.cargarCatalogos();
    this.cargarFacturadorYPtoEmision();
    this.resetComprador();
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

    const empresaStr = sessionStorage.getItem('empresa') || localStorage.getItem('empresa');
    if (empresaStr) {
      try {
        const empresa = JSON.parse(empresaStr);
        this.vEmpresaCodigo = Number(empresa?.codigo) || 0;
      } catch {
        this.vEmpresaCodigo = 0;
      }
    }
    if (!this.vEmpresaCodigo) {
      const idEmpresa = sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa');
      if (idEmpresa) this.vEmpresaCodigo = parseInt(idEmpresa, 10) || 0;
    }

    const facturadorStr = sessionStorage.getItem('facturador') || localStorage.getItem('facturador');
    if (facturadorStr) {
      try {
        this.vFacturador = JSON.parse(facturadorStr) as Facturador;
        this.armarLogo();
      } catch {
        this.vFacturador = {} as Facturador;
      }
    }
  }

  private armarLogo(): void {
    if (!this.vFacturador?.logo) {
      this.vLogo = '';
      return;
    }
    const apiBase = (window as unknown as { __env?: { apiBase?: string } }).__env?.apiBase || '/api/saa-backend/rest';
    this.vLogo = `${apiBase.replace('/rest', '')}/resources/logos/${this.vFacturador.logo}`;
  }

  private cargarFacturadorYPtoEmision(): void {
    if (!this.vFacturador?.id) {
      this.facturadorService.getAll().subscribe({
        next: (facturadores) => {
          const primero = (facturadores || [])[0];
          if (primero) {
            this.vFacturador = primero;
            this.armarLogo();
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
        if (activos.length > 0) {
          this.ptoEmision = activos[0];
        }
      },
    });
  }

  private cargarCatalogos(): void {
    this.detalleSriService.getAll().subscribe({
      next: (all) => {
        const detalles = (all || []).filter((d) => d.estado === 1);
        this.ivaOpciones = detalles.filter((d) => this.getTablaCodigo(d.lsri) === TABLA_IVA);
        this.tablaSRIIVAGral = detalles.filter((d) => this.getTablaCodigo(d.lsri) === IVA_GENERAL);
        this.tablaSRIFormasPago = detalles.filter((d) => this.getTablaCodigo(d.lsri) === TABLA_FORMA_PAGO);
        this.tablaSRIFormasPagoInternas = detalles.filter((d) => this.getTablaCodigo(d.lsri) === TABLA_FORMA_PAGO_INTERNA);

        this.aplicarIvaGeneralPorFecha();
        this.recuperaFormaPagoDefault();
        this.recuperaFormaPagoInternaDefault();
      },
    });
  }

  private getTablaCodigo(lsri: number | { tabla?: string }): string {
    if (typeof lsri === 'object' && lsri?.tabla) {
      return String(lsri.tabla);
    }
    if (typeof lsri === 'number') {
      return String(lsri);
    }
    return '';
  }

  buscarClientePorTexto(texto: string): void {
    if ((texto || '').trim().length < 2) {
      this.personasCliente.set([]);
      return;
    }
    this.personaClienteService.buscarClientes(texto).subscribe((personas) => {
      this.personasCliente.set(personas || []);
    });
  }

  seleccionarPersona(event: { option: { value: Titular } }): void {
    const persona = event.option.value as Titular;
    this.asignaCliente(persona);
  }

  getComprador(): void {
    const doc = (this.txtCIRUC.value || '').toString();
    if (!doc) {
      return;
    }

    this.personaClienteService.buscarClientes(doc).subscribe((personas) => {
      const exacta = (personas || []).find((p) => (p.identificacion || '').trim() === doc.trim());
      if (exacta) {
        this.asignaCliente(exacta);
      } else if ((personas || []).length > 0) {
        this.asignaCliente(personas![0]);
      } else {
        this.personasCliente.set([]);
        this.txtComprador = '';
      }
    });
  }

  buscaCliente(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: {
        rolCodigo: this.rolClienteCodigo,
        rolNombre: 'CLIENTE',
        titulo: 'Buscar Cliente',
      },
    });

    dialogRef.afterClosed().subscribe((titular: Titular | null) => {
      if (titular) {
        this.asignaCliente(titular);
      }
    });
  }

  buscaProducto(): void {
    const dialogRef = this.dialog.open(ProductoSelectorDialogComponent, {
      width: '1200px',
      maxWidth: '98vw',
      data: {
        titulo: 'Buscar Producto CXC',
      },
    });

    dialogRef.afterClosed().subscribe((producto: ProductoCobro | null) => {
      if (producto) {
        this.asignaValorProductoInventario(producto);
      }
    });
  }

  asignaCliente(cliente: Titular): void {
    this.personaSeleccionada.set(cliente);
    this.vComprador = cliente;
    this.txtCIRUC.setValue(cliente.identificacion || '');
    this.txtComprador = cliente.razonSocial || cliente.nombre || '';
    this.txtDireccion = cliente.direccion || '';
    this.txtTelefono = cliente.telefono || '';
    this.txteMail.setValue(cliente.email || '');
  }

  limpiarComprador(): void {
    this.vComprador = {} as Titular;
    this.personaSeleccionada.set(null);
    this.txtCIRUC.setValue('');
    this.txtComprador = '';
    this.txtDireccion = '';
    this.txtTelefono = '';
    this.txteMail.setValue('');
  }

  private resetComprador(): void {
    this.limpiarComprador();
  }

  validaIVAByCambioFecha(): void {
    this.aplicarIvaGeneralPorFecha();
    this.procesoCalculaTotal();
  }

  private aplicarIvaGeneralPorFecha(): void {
    if (this.tablaSRIIVAGral.length === 0) {
      return;
    }

    const fechaActual = this.parseFechaLocal(this.fechaControl.value);
    const actual = this.tablaSRIIVAGral.find((r) => fechaActual >= FECHA_CAMBIO_IVA && Number(r.porcentaje) >= 12);
    const anterior = this.tablaSRIIVAGral.find((r) => Number(r.porcentaje) < 12);

    const elegido = fechaActual >= FECHA_CAMBIO_IVA ? actual || this.tablaSRIIVAGral[0] : anterior || this.tablaSRIIVAGral[0];

    this.lbIvaGral = String(elegido.porcentaje || 0);
    this.nmIvaGral = Number(elegido.porcentaje || 0);
    this.nmCodigoIVASRI = Number(elegido.codigo || 0);
  }

  recuperaFormaPagoDefault(): void {
    this.formaPagoFactura =
      this.tablaSRIFormasPago.find((r) => r.codigo === SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO) ||
      this.tablaSRIFormasPago[0];
  }

  recuperaFormaPagoInternaDefault(): void {
    this.formaPagoFacturaOtro =
      this.tablaSRIFormasPagoInternas.find((r) => r.codigo === EFECTIVO) ||
      this.tablaSRIFormasPagoInternas[0];
  }

  nueva(): void {
    this.vFactura = null;
    this.deshabilitado = false;
    this.listaDetFactura = [];
    this.dataSource.data = [];
    this.setFecha();

    this.lbSubtotal = 0;
    this.lbSubtotal5 = 0;
    this.lbSubtotal8 = 0;
    this.lbIVACero = 0;
    this.lbTotalIVA = 0;
    this.lbTotalIVA5 = 0;
    this.lbTotalIVA8 = 0;
    this.lbTotal = 0;
    this.txtDescuento = 0;
    this.txtPorDescuento = 0;
    this.txtPropina = 0;
    this.txtObservacion = '';

    this.limpiarIngreso();
    this.resetComprador();

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  asignaValorProductoInventario(item: ProductoCobro): void {
    if (!item) {
      return;
    }

    this.productoSeleccionado.set(item);
    this.txtProducto = `${item.codigo} - ${item.nombre}`;

    const tipoIva = this.ivaOpciones.find((iva) => Number(iva.codigo) === Number(item.tipoIVA));
    this.lbTipoIva = tipoIva ? String(tipoIva.porcentaje || 0) : 'No definido';
    this.lbIncluyeIva = Number(item.incluyeIVA) === 1 ? 'SI' : 'NO';

    if (Number(item.tipoDescuento) === 1) {
      this.lbTipoDescuento = `${item.descuento || 0}%`;
    } else {
      this.lbTipoDescuento = `${item.descuento || 0}`;
    }

    this.txtDescuentoDetalle = item.descuento || 0;
    this.txtValor = Number(item.precioUnitario || 0);
    this.txtProductoTrans = item.nombre || '';
    this.cambioCantidad();
  }

  cambioCantidad(): void {
    this.txtCantidad = Math.round((this.txtCantidad || 0) * 100) / 100;
    this.txtValor = Math.round((this.txtValor || 0) * 10000) / 10000;
    this.txtTotal = Math.round((this.txtCantidad * this.txtValor) * 100) / 100;
  }

  private validarAdd(): boolean {
    if (!this.productoSeleccionado()) {
      this.mostrarError('Debe seleccionar un producto');
      return false;
    }

    if (!this.txtCantidad || this.txtCantidad <= 0) {
      this.mostrarError('La cantidad debe ser mayor que 0');
      return false;
    }

    if (!this.txtValor || this.txtValor <= 0) {
      this.mostrarError('El valor debe ser mayor que 0');
      return false;
    }

    return true;
  }

  addProducto(): void {
    if (!this.validarAdd()) {
      return;
    }

    const item = {} as DetalleFacturaEmitir;
    item.id = null as unknown as number;
    item.factura = {} as FacturaEmitir;
    item.cantidad = Math.round((this.txtCantidad || 0) * 100) / 100;
    item.valor = Math.round((this.txtValor || 0) * 10000) / 10000;

    const prod = this.productoSeleccionado() as ProductoCobro;
    item.producto = prod;
    item.descripcion = Number(this.vFacturador.impCodProd) === 1 && this.txtProductoTrans ? this.txtProductoTrans : (prod.nombre || '');

    const tipoIva = this.ivaOpciones.find((iva) => Number(iva.codigo) === Number(prod.tipoIVA));
    item.porcentajeIVA = Number(tipoIva?.porcentaje || this.nmIvaGral);
    item.codigoIVASRI = Number(tipoIva?.codigo || this.nmCodigoIVASRI);

    const incluyeIvaProducto = Number(prod.incluyeIVA) === 1;
    if (incluyeIvaProducto && item.porcentajeIVA > 0) {
      const divisor = 1 + item.porcentajeIVA / 100;
      item.valor = Math.round((item.valor / divisor) * 10000) / 10000;
    }

    item.descuento = this.calculaDescuentoProducto(item, prod);

    item.subTotal = Math.round((item.valor * item.cantidad) * 100) / 100;
    item.baseImponible = Math.round((item.subTotal - item.descuento) * 100) / 100;
    item.valorIVA = Math.round((item.baseImponible * item.porcentajeIVA / 100) * 100) / 100;
    item.total = Math.round((item.baseImponible + item.valorIVA) * 100) / 100;
    item.porcentajeICE = 0;
    item.valorICE = 0;
    item.subsidio = 0;
    item.precioSinSub = 0;
    item.estado = 1;

    this.listaDetFactura.push(item);
    this.dataSource.data = [...this.listaDetFactura];
    this.procesoCalculaTotal();
    this.limpiarIngreso();
  }

  eliminaDetalle(item: DetalleFacturaEmitir): void {
    this.listaDetFactura = this.listaDetFactura.filter((it) => it !== item);
    this.dataSource.data = [...this.listaDetFactura];
    this.procesoCalculaTotal();
  }

  private calculaDescuentoProducto(item: DetalleFacturaEmitir, producto: ProductoCobro): number {
    const descuento = Number(producto.descuento || 0);
    if (!descuento) {
      return 0;
    }

    if (Number(producto.tipoDescuento) === 1) {
      return Math.round((item.subTotal * descuento / 100) * 100) / 100;
    }

    return Math.round(descuento * 100) / 100;
  }

  recalculaDescuento(event: Event, origen: number): void {
    const newValue = Number((event.target as HTMLInputElement).value || 0);
    this.prorrateaDescuento(newValue, origen);
    this.calculaTotalesFinal();
  }

  private procesoCalculaTotal(): void {
    this.blanqueaDescuentos();
    this.prorrateaDescuento();
    this.calculaTotalesFinal();
  }

  private blanqueaDescuentos(): void {
    this.txtDescuento = 0;
    this.txtPorDescuento = 0;
  }

  private prorrateaDescuento(valorIngresado?: number, origen?: number): void {
    if (this.listaDetFactura.length === 0) {
      this.blanqueaDescuentos();
      return;
    }

    let subtotal = 0;
    this.listaDetFactura.forEach((registro) => {
      subtotal += Number(registro.subTotal || 0);
    });

    let descuentoIngresado = 0;
    if (origen === 1) {
      descuentoIngresado = valorIngresado || 0;
    } else if (origen === 2) {
      descuentoIngresado = Math.round((subtotal * (valorIngresado || 0) / 100) * 100) / 100;
    }

    const descuentoTotal = Math.max(0, descuentoIngresado);

    let acumulado = 0;
    this.listaDetFactura.forEach((registro, index) => {
      const proporcion = subtotal > 0 ? (registro.subTotal / subtotal) : 0;
      const valorProrrateado = index === this.listaDetFactura.length - 1
        ? Math.round((descuentoTotal - acumulado) * 100) / 100
        : Math.round((descuentoTotal * proporcion) * 100) / 100;

      acumulado += valorProrrateado;
      registro.descuento = Math.round((valorProrrateado + this.calculaDescuentoProducto(registro, registro.producto || {} as ProductoCobro)) * 100) / 100;
      registro.baseImponible = Math.round((registro.subTotal - registro.descuento) * 100) / 100;
      registro.valorIVA = Math.round((registro.baseImponible * registro.porcentajeIVA / 100) * 100) / 100;
      registro.total = Math.round((registro.baseImponible + registro.valorIVA) * 100) / 100;
    });

    const totalDescuento = this.listaDetFactura.reduce((sum, r) => sum + Number(r.descuento || 0), 0);
    this.txtDescuento = Math.round(totalDescuento * 100) / 100;
    this.txtPorDescuento = subtotal > 0 ? Math.round((this.txtDescuento * 100 / subtotal) * 100) / 100 : 0;
  }

  private calculaTotalesFinal(): void {
    let subtotal12 = 0;
    let subtotal0 = 0;
    let subtotal5 = 0;
    let subtotal8 = 0;
    let iva12 = 0;
    let iva5 = 0;
    let iva8 = 0;

    this.listaDetFactura.forEach((registro) => {
      const porcentaje = Number(registro.porcentajeIVA || 0);
      const base = Number(registro.baseImponible || 0);
      const iva = Math.round((base * porcentaje / 100) * 100) / 100;
      registro.valorIVA = iva;
      registro.total = Math.round((base + iva) * 100) / 100;

      if (porcentaje === 0) {
        subtotal0 += base;
      } else if (porcentaje === 5) {
        subtotal5 += base;
        iva5 += iva;
      } else if (porcentaje === 8) {
        subtotal8 += base;
        iva8 += iva;
      } else {
        subtotal12 += base;
        iva12 += iva;
      }
    });

    this.lbIVACero = Math.round(subtotal0 * 100) / 100;
    this.lbSubtotal5 = Math.round(subtotal5 * 100) / 100;
    this.lbSubtotal8 = Math.round(subtotal8 * 100) / 100;
    this.lbSubtotal = Math.round(subtotal12 * 100) / 100;

    this.lbTotalIVA5 = Math.round(iva5 * 100) / 100;
    this.lbTotalIVA8 = Math.round(iva8 * 100) / 100;
    this.lbTotalIVA = Math.round(iva12 * 100) / 100;

    this.lbTotal = Math.round((this.lbIVACero + this.lbSubtotal5 + this.lbSubtotal8 + this.lbSubtotal + this.lbTotalIVA5 + this.lbTotalIVA8 + this.lbTotalIVA + Number(this.txtPropina || 0)) * 100) / 100;

    this.dataSource.data = [...this.listaDetFactura];
  }

  generaFactura(): void {
    if (this.vFactura?.id) {
      this.mostrarError('La factura ya fue emitida');
      return;
    }

    if (this.listaDetFactura.length === 0) {
      this.mostrarError('Factura sin detalle');
      this.inCantidad?.nativeElement?.focus();
      return;
    }

    if (!this.formaPagoFactura || !this.formaPagoFacturaOtro) {
      this.mostrarError('Seleccione forma de pago y forma de pago interna');
      return;
    }

    if (this.plazoPago < 1) {
      this.mostrarError('El plazo de pago debe ser mayor o igual a 1');
      return;
    }

    if (!this.personaSeleccionada()?.codigo) {
      this.mostrarError('Debe seleccionar un cliente para continuar');
      return;
    }

    if (!this.ptoEmision?.id) {
      this.mostrarError('No existe punto de emisión configurado');
      return;
    }

    const comprador = this.personaSeleccionada() as Titular;
    const fechaFactura = this.parseFechaLocal(this.fechaControl.value);

    // Construir array de formas de pago
    const formaPagosFactura: any[] = [
      {
        formaPago: this.formaPagoFactura.codigo,      // Código SRI tabla 24 (forma de pago)
        valor: this.lbTotal,                          // Valor total de la factura
        plazo: this.plazoPago,                        // Plazo de pago
        unidadTiempo: 'dias',                         // Unidad de tiempo
      },
    ];

    const payload: Partial<FacturaEmitir> & { detalleFactura?: DetalleFacturaEmitir[]; formaPagoCodigo?: string; plazo?: number; empresa?: { codigo: number } } = {
      id: null as unknown as number,
      tipoComprobante: FACTURA,
      facturador: this.vFacturador,
      titular: comprador,
      tipoDoc: '04',
      numero: '',
      numEstablecimiento: this.ptoEmision.establecimiento?.codigo || '',
      numPtoEmision: this.ptoEmision.codigo || '',
      secuencial: '',
      ambiente: 1,
      clave: '',
      fecha: fechaFactura,
      observacion: this.txtObservacion,
      subtotal: this.lbSubtotal,
      subtotal5: this.lbSubtotal5,
      subtotal8: this.lbSubtotal8,
      subcero: this.lbIVACero,
      pIVA: this.nmIvaGral,
      vIVA: this.lbTotalIVA,
      vIVA5: this.lbTotalIVA5,
      vIVA8: this.lbTotalIVA8,
      vICE: 0,
      vIRBPNR: 0,
      descuento: this.txtDescuento,
      porDescuento: this.txtPorDescuento,
      propina: this.txtPropina,
      subsidio: 0,
      totalSinSub: 0,
      ahorroSub: 0,
      total: this.lbTotal,
      ptoEmision: this.ptoEmision,
      usuario: this.vUsuario,
      pathGen: '',
      autorizacion: '',
      fechaAutorizacion: '',
      formaPago: Number(this.formaPagoFactura.id || 0),
      estado: 1,
      estadoEmision: 1,
      detalleFactura: this.listaDetFactura,
      formaPagoCodigo: this.formaPagoFactura.codigo,
      plazo: this.plazoPago,
      formaPagosFactura: formaPagosFactura,
      empresa: this.vEmpresaCodigo ? { codigo: this.vEmpresaCodigo } : undefined,
    };

    const requestBody = {
      factura: {
        ...payload,
        comprador: {
          id: comprador.codigo,
          email: comprador.email || '',
        },
      },
    };

    this.guardando.set(true);
    this.facturaService.procesarCompleta(requestBody).subscribe({
      next: (resp) => {
        this.deshabilitado = true;
        this.guardando.set(false);
        this.mostrarExito('Factura autorizada correctamente');

        const idFactura = resp?.id;
        if (idFactura) {
          // Tenemos el id: recargar factura completa
          this.vFactura = resp;
          this.facturaService.getById(String(idFactura)).subscribe({
            next: (facturaCompleta) => {
              if (facturaCompleta?.id) {
                this.vFactura = facturaCompleta;
              }
            },
            error: () => { /* vFactura ya está asignado desde resp */ },
          });
        } else {
          // El backend no devolvió el objeto: buscar por titular y secuencial más reciente
          this.buscarFacturaRecienEmitida(comprador.codigo);
        }
      },
      error: (err) => {
        this.guardando.set(false);
        this.mostrarError(this.parseError(err, 'No se pudo grabar la factura'));
      },
    });
  }

  /** Fallback: busca la factura recién emitida del titular usando selectByCriteria */
  private buscarFacturaRecienEmitida(codigoTitular: number): void {
    const criterios: DatosBusqueda[] = [];

    const cTitular = new DatosBusqueda();
    cTitular.asignaValorConCampoPadre(
      TipoDatos.LONG, 'titular', 'codigo', String(codigoTitular), TipoComandosBusqueda.IGUAL
    );
    cTitular.setNumeroCampoRepetido(0);
    criterios.push(cTitular);

    if (this.vEmpresaCodigo) {
      const cEmpresa = new DatosBusqueda();
      cEmpresa.asignaValorConCampoPadre(
        TipoDatos.LONG, 'empresa', 'codigo', String(this.vEmpresaCodigo), TipoComandosBusqueda.IGUAL
      );
      cEmpresa.setNumeroCampoRepetido(0);
      criterios.push(cEmpresa);
    }

    this.facturaService.selectByCriteria(criterios).subscribe({
      next: (facturas) => {
        const lista = (facturas || []).sort((a, b) => (b.id || 0) - (a.id || 0));
        if (lista[0]?.id) {
          this.vFactura = lista[0];
        }
      },
      error: () => { /* no se pudo recuperar, imprimir no estará disponible */ },
    });
  }

  imprimeFactura(): void {
    if (!this.vFactura?.id) {
      this.mostrarError('Primero debe emitir el documento');
      return;
    }

    this.jasperReportes.generar('cxc', 'RPRT_RIDE_FACTURA', { P_ID_FACTURA: this.vFactura.id }, 'PDF').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      error: () => this.mostrarError('No se pudo generar el reporte'),
    });
  }

  actualizaViewCombo(p1: { id?: number }, p2: { id?: number }): boolean {
    return !!p1 && !!p2 && Number(p1.id) === Number(p2.id);
  }

  nvl(valor: unknown, campo: unknown): unknown {
    return valor || campo;
  }

  setFecha(): void {
    this.fechaControl.setValue(new Date());
  }

  // Captura el texto crudo mientras el usuario escribe, como en asientos dinámicos (CNT)
  private _rawFecha: string = '';

  capturarFechaRaw(event: Event): void {
    this._rawFecha = (event.target as HTMLInputElement).value;
  }

  syncFechaFromRaw(event: FocusEvent): void {
    const rawValue: string = (this._rawFecha || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFecha = '';
    if (!rawValue) return;

    const parts = rawValue.split('/');
    if (parts.length !== 3) return;

    const dia = Number(parts[0]);
    const mes = Number(parts[1]) - 1;
    const anio = Number(parts[2]);

    if (
      !isNaN(dia) && dia >= 1 && dia <= 31 &&
      !isNaN(mes) && mes >= 0 && mes <= 11 &&
      !isNaN(anio) && anio >= 1000 && anio <= 9999
    ) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        // Actualizar el FormControl con el Date (no string) para que Material no lo borre
        this.fechaControl.setValue(date, { emitEvent: false });
        // Después de que Material procese el blur, forzar el texto dd/MM/yyyy en el input nativo
        setTimeout(() => {
          if (this.fechaFacturaInputRef?.nativeElement) {
            this.fechaFacturaInputRef.nativeElement.value = formatted;
          }
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
      if (this.fechaFacturaInputRef?.nativeElement) {
        this.fechaFacturaInputRef.nativeElement.value = formatted;
      }
    });
    this.validaIVAByCambioFecha();
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
    if (!anio || !mes || !dia) {
      return new Date(fechaTexto);
    }

    return new Date(anio, mes - 1, dia);
  }

  private limpiarIngreso(): void {
    this.lbIncluyeIva = '';
    this.lbTipoIva = '';
    this.lbTipoDescuento = '';
    this.productoSeleccionado.set(null);
    this.txtProducto = '';
    this.txtProductoTrans = '';
    this.txtCantidad = 0;
    this.txtValor = 0;
    this.txtTotal = 0;
    this.chkIvaCero = false;
    this.chkIncluye = false;
  }

  responsive(width: number): void {
    if (width >= 1024) {
      this.vertical = false;
      this.areaIzq = 'area-izq-borde';
      this.areaDer = 'area-der';
      this.cabeceraDatos = 'cabecera-datos';
      return;
    }

    this.vertical = true;
    this.areaIzq = 'area-izq-ver';
    this.areaDer = 'area-der-ver';
    this.cabeceraDatos = width >= 680 ? 'cabecera-datos' : 'cabecera-datos-ver';
  }

  private parseError(error: unknown, fallback: string): string {
    if (!error) {
      return fallback;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      // Mensaje directo en el objeto
      if (err['message'] && typeof err['message'] === 'string') {
        return err['message'];
      }
      // Respuesta HTTP: err.error puede ser string o un objeto con message
      if (err['error']) {
        if (typeof err['error'] === 'string') {
          return err['error'];
        }
        const inner = err['error'] as Record<string, unknown>;
        if (inner['message'] && typeof inner['message'] === 'string') {
          return inner['message'];
        }
        if (inner['mensaje'] && typeof inner['mensaje'] === 'string') {
          return inner['mensaje'];
        }
      }
      // statusText como último recurso
      if (err['statusText'] && typeof err['statusText'] === 'string' && err['statusText'] !== 'Unknown Error') {
        return err['statusText'];
      }
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
