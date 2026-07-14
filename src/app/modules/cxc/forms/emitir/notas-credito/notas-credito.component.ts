import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { ProductoSelectorDialogComponent } from '../../../../../shared/components/producto-selector-dialog/producto-selector-dialog.component';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { Usuario } from '../../../../../shared/model/usuario';
import { NotaCreditoEmitir } from '../../../model/nota-credito-emitir';
import { DetalleNotaCreditoEmitir } from '../../../model/detalle-nota-credito-emitir';
import { Titular } from '../../../../tsr/model/titular';
import { Facturador } from '../../../model/facturador';
import { PuntoEmision } from '../../../model/puntos-emision';
import { ProductoCobro } from '../../../model/producto-cobro';
import { DetalleSri } from '../../../model/detalle-sri';
import { NotaCreditoEmitirService } from '../../../service/emitir/nota-credito-emitir.service';
import { DetalleNotaCreditoEmitirService } from '../../../service/emitir/detalle-nota-credito-emitir.service';
import { FacturadorService } from '../../../service/facturador.service';
import { PuntoEmisionService } from '../../../service/punto-emision.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';

const IVA_GENERAL = '614';
const TABLA_IVA = '17';
const TABLA_FORMA_PAGO_SRI = '24';
const NOTA_CREDITO = '04';
const FECHA_CAMBIO_IVA = new Date('2024-04-01');
const SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO = '01';

@Component({
  selector: 'app-notas-credito',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './notas-credito.component.html',
  styleUrl: './notas-credito.component.scss',
})
export class NotasCreditoComponent implements OnInit {
  @ViewChild('inCantidad') inCantidad!: ElementRef;

  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private service = inject(NotaCreditoEmitirService);
  private detalleService = inject(DetalleNotaCreditoEmitirService);
  private facturadorService = inject(FacturadorService);
  private puntoEmisionService = inject(PuntoEmisionService);
  private detalleSriService = inject(DetalleSriService);
  private funcionesDatosS = inject(FuncionesDatosService);

  cargando = signal(false);
  guardando = signal(false);
  documentoActual = signal<NotaCreditoEmitir | null>(null);
  registroId: number | null = null;
  deshabilitado = false;

  personaSeleccionada = signal<Titular | null>(null);
  textoTitularSeleccionado = computed(() => this.displayPersona(this.personaSeleccionada()));
  readonly rolClienteCodigo = 1;
  readonly documentoNombre = 'Nota de Crédito';

  vFacturador = {} as Facturador;
  vUsuario = { codigo: 0 } as Usuario;
  ptosEmision: PuntoEmision[] = [];
  ptoEmision: PuntoEmision | null = null;

  ivaOpciones: DetalleSri[] = [];
  tablaSRIIVAGral: DetalleSri[] = [];
  tablaSRIFormasPago: DetalleSri[] = [];
  formaPagoSri: DetalleSri | null = null;

  strFecha: Date | string = '';
  observacion = '';
  plazoPago = 1;
  tipoDocModificado = '01';
  numDocModificado = '';
  strFechaEmisionDM: Date | string = '';

  nmIvaGral = 15;
  nmCodigoIVASRI = 0;
  lbIvaGral = '15';

  productoSeleccionado = signal<ProductoCobro | null>(null);
  textoProductoSeleccionado = computed(() => {
    const p = this.productoSeleccionado();
    return p ? `${p.codigo} - ${p.nombre}` : '';
  });
  txtCantidad = 1;
  txtValor = 0;
  txtTotal = 0;
  txtDescuentoDetalle = 0;
  lbTipoIva = '';
  lbIncluyeIva = '';
  lbTipoDescuento = '';

  lbSubtotal = 0;
  lbSubtotal5 = 0;
  lbSubtotal8 = 0;
  lbIVACero = 0;
  lbTotalIVA = 0;
  lbTotalIVA5 = 0;
  lbTotalIVA8 = 0;
  txtDescuento = 0;
  txtPorDescuento = 0;
  txtPropina = 0;
  lbTotal = 0;

  listaDetalles: DetalleNotaCreditoEmitir[] = [];
  dataSourceDetalle = new MatTableDataSource<DetalleNotaCreditoEmitir>([]);
  columnas = ['cantidad', 'descripcion', 'valor', 'subTotal', 'descuento', 'baseImponible', 'iva', 'total', 'acciones'];

  registros = signal<NotaCreditoEmitir[]>([]);
  dataSourceRegistros = new MatTableDataSource<NotaCreditoEmitir>([]);
  columnasRegistros = ['id', 'fecha', 'numero', 'persona', 'total', 'estado'];

  areaIzq = 'area-izq-borde';
  areaDer = 'area-der';
  vertical = false;

  @HostListener('window:resize')
  onResize(): void { this.responsive(window.innerWidth); }

  ngOnInit(): void {
    this.cargarSesion();
    this.setFecha();
    this.responsive(window.innerWidth);
    this.cargarCatalogos();
    this.cargarFacturadorYPtoEmision();
    this.cargarRegistros();
  }

  get accionPrincipal(): string {
    return this.documentoActual()?.id ? 'Nota emitida' : 'Emitir nota de crédito';
  }

  recargar(): void { this.cargarRegistros(); }

  cargarRegistros(): void {
    this.cargando.set(true);
    this.service.getAll().subscribe({
      next: (data) => {
        this.registros.set(data || []);
        this.dataSourceRegistros.data = data || [];
        this.cargando.set(false);
      },
      error: () => { this.mostrarError('No se pudieron cargar las notas de crédito'); this.cargando.set(false); },
    });
  }

  buscaCliente(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px', maxWidth: '98vw',
      data: { rolCodigo: this.rolClienteCodigo, rolNombre: 'CLIENTE', titulo: 'Buscar Cliente' },
    });
    dialogRef.afterClosed().subscribe((t: Titular | null) => { if (t) this.asignaCliente(t); });
  }

  asignaCliente(cliente: Titular): void { this.personaSeleccionada.set(cliente); }
  limpiarCliente(): void { this.personaSeleccionada.set(null); }

  displayPersona(persona: Titular | null): string {
    if (!persona) return '';
    return `${persona.identificacion || ''} - ${persona.razonSocial || persona.nombre || ''}`.trim();
  }

  buscaProducto(): void {
    const dialogRef = this.dialog.open(ProductoSelectorDialogComponent, {
      width: '1200px', maxWidth: '98vw', data: { titulo: 'Buscar Producto CXC' },
    });
    dialogRef.afterClosed().subscribe((p: ProductoCobro | null) => { if (p) this.asignaProducto(p); });
  }

  asignaProducto(item: ProductoCobro): void {
    if (!item) return;
    this.productoSeleccionado.set(item);
    const tipoIva = this.ivaOpciones.find((iva) => Number(iva.codigo) === Number(item.tipoIVA));
    this.lbTipoIva = tipoIva ? String(tipoIva.porcentaje || 0) : 'No definido';
    this.lbIncluyeIva = Number(item.incluyeIVA) === 1 ? 'SI' : 'NO';
    this.lbTipoDescuento = Number(item.tipoDescuento) === 1 ? `${item.descuento || 0}%` : `${item.descuento || 0}`;
    this.txtDescuentoDetalle = item.descuento || 0;
    this.txtValor = Number(item.precioUnitario || 0);
    this.cambioCantidad();
  }

  cambioCantidad(): void {
    this.txtCantidad = this.rd(this.txtCantidad || 0);
    this.txtValor = this.rd(this.txtValor || 0, 4);
    this.txtTotal = this.rd(this.txtCantidad * this.txtValor);
  }

  addProducto(): void {
    if (!this.productoSeleccionado()) { this.mostrarError('Debe seleccionar un producto'); return; }
    if (this.txtCantidad <= 0) { this.mostrarError('La cantidad debe ser mayor que 0'); return; }
    if (this.txtValor <= 0) { this.mostrarError('El valor debe ser mayor que 0'); return; }

    const prod = this.productoSeleccionado() as ProductoCobro;
    const tipoIva = this.ivaOpciones.find((iva) => Number(iva.codigo) === Number(prod.tipoIVA));
    const porcentajeIVA = Number(tipoIva?.porcentaje || this.nmIvaGral);
    let valor = this.rd(this.txtValor, 4);
    if (Number(prod.incluyeIVA) === 1 && porcentajeIVA > 0) valor = this.rd(valor / (1 + porcentajeIVA / 100), 4);
    const cantidad = this.rd(this.txtCantidad);
    const subTotal = this.rd(valor * cantidad);
    const desc = Number(prod.descuento || 0);
    const descuento = desc > 0 ? (Number(prod.tipoDescuento) === 1 ? this.rd(subTotal * desc / 100) : this.rd(desc)) : 0;
    const baseImponible = this.rd(subTotal - descuento);
    const valorIVA = this.rd(baseImponible * porcentajeIVA / 100);

    const item = {
      id: null as unknown as number, notaCredito: {} as NotaCreditoEmitir,
      descripcion: prod.nombre || '', cantidad, valor, subTotal, descuento, baseImponible,
      porcentajeIVA, valorIVA, porcentajeICE: 0, valorICE: 0, subsidio: 0,
      total: this.rd(baseImponible + valorIVA), producto: prod, estado: 1,
    } as DetalleNotaCreditoEmitir;

    this.listaDetalles.push(item);
    this.dataSourceDetalle.data = [...this.listaDetalles];
    this.procesoCalculaTotal();
    this.limpiarIngreso();
  }

  eliminaDetalle(item: DetalleNotaCreditoEmitir): void {
    this.listaDetalles = this.listaDetalles.filter((d) => d !== item);
    this.dataSourceDetalle.data = [...this.listaDetalles];
    this.procesoCalculaTotal();
  }

  recalculaDescuento(event: Event, origen: number): void {
    const v = Number((event.target as HTMLInputElement).value || 0);
    this.prorrateaDescuento(v, origen);
    this.calculaTotalesFinal();
  }

  validaIVAByCambioFecha(): void { this.aplicarIvaGeneralPorFecha(); this.procesoCalculaTotal(); }

  generaNotaCredito(): void {
    if (this.documentoActual()?.id) { this.mostrarError('La nota de crédito ya fue emitida'); return; }
    if (!this.listaDetalles.length) { this.mostrarError('Nota de crédito sin detalle'); return; }
    if (!this.personaSeleccionada()?.codigo) { this.mostrarError('Debe seleccionar un cliente para continuar'); return; }
    if (!this.ptoEmision?.id) { this.mostrarError('No existe punto de emisión configurado'); return; }
    if (!this.numDocModificado.trim()) { this.mostrarError('Ingrese el número del documento modificado'); return; }

    const comprador = this.personaSeleccionada() as Titular;
    const fechaDoc = this.parseFechaLocal(this.strFecha);
    const fechaDM = this.parseFechaLocal(this.strFechaEmisionDM);

    const payload: any = {
      id: null,
      tipoComprobante: NOTA_CREDITO,
      facturador: this.vFacturador,
      titular: comprador,
      tipoDoc: '04',
      numero: '',
      numEstablecimiento: this.ptoEmision.establecimiento?.codigo || '',
      numPtoEmision: this.ptoEmision.codigo || '',
      secuencial: '',
      ambiente: 1,
      clave: '',
      fecha: fechaDoc.toISOString(),
      tipoDocModificado: this.tipoDocModificado,
      numDocModificado: this.numDocModificado.trim(),
      fechaEmisionDM: fechaDM.toISOString(),
      observacion: this.observacion,
      subtotal: this.lbSubtotal,
      subcero: this.lbIVACero,
      pIVA: this.nmIvaGral,
      vIVA: this.lbTotalIVA,
      vICE: 0, vIRBPNR: 0,
      descuento: this.txtDescuento,
      porDescuento: this.txtPorDescuento,
      propina: this.txtPropina,
      subsidio: 0,
      total: this.lbTotal,
      ptoEmision: this.ptoEmision,
      usuario: this.vUsuario,
      pathGen: '', autorizacion: '', fechaAutorizacion: '',
      estado: 1, estadoEmision: 1,
      detalleNotaCredito: this.listaDetalles,
      formaPagoCodigo: this.formaPagoSri?.codigo || SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO,
      plazo: this.plazoPago,
    };

    this.guardando.set(true);
    this.service.grabarNotaCredito(payload).subscribe({
      next: (resp) => {
        this.documentoActual.set(resp || null);
        this.registroId = resp?.id || null;
        this.deshabilitado = true;
        this.guardando.set(false);
        this.mostrarExito('Nota de crédito generada correctamente');
        this.cargarRegistros();
      },
      error: (err) => { this.guardando.set(false); this.mostrarError(this.parseError(err, 'No se pudo grabar la nota de crédito')); },
    });
  }

  nueva(): void {
    this.documentoActual.set(null); this.registroId = null; this.deshabilitado = false;
    this.listaDetalles = []; this.dataSourceDetalle.data = [];
    this.setFecha();
    this.lbSubtotal = 0; this.lbSubtotal5 = 0; this.lbSubtotal8 = 0;
    this.lbIVACero = 0; this.lbTotalIVA = 0; this.lbTotalIVA5 = 0; this.lbTotalIVA8 = 0;
    this.lbTotal = 0; this.txtDescuento = 0; this.txtPorDescuento = 0; this.txtPropina = 0;
    this.observacion = ''; this.numDocModificado = ''; this.tipoDocModificado = '01'; this.strFechaEmisionDM = '';
    this.limpiarIngreso(); this.limpiarCliente();
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  imprimirDocumento(): void {
    const contenido = document.getElementById('ticket-nota-credito')?.innerHTML;
    if (!contenido) { this.mostrarError('No existe contenido para imprimir'); return; }
    const ventana = window.open('', '_blank');
    if (!ventana) { this.mostrarError('No se pudo abrir la ventana de impresión'); return; }
    ventana.document.write(contenido); ventana.document.close(); ventana.focus(); ventana.print(); ventana.close();
  }

  copiarAutorizacion(): void {
    const clv = this.documentoActual()?.autorizacion || this.documentoActual()?.clave;
    if (!clv) { this.mostrarError('No existe clave de acceso disponible'); return; }
    navigator.clipboard.writeText(clv).then(() => this.mostrarExito('Clave copiada al portapapeles'));
  }

  estadoLabel(estado: number | null | undefined): string { return Number(estado) === 1 ? 'Activo' : 'Inactivo'; }

  actualizaViewCombo(p1: { id?: number }, p2: { id?: number }): boolean {
    return !!p1 && !!p2 && Number(p1.id) === Number(p2.id);
  }

  setFecha(): void {
    this.strFecha = new Date();
    if (!this.strFechaEmisionDM) this.strFechaEmisionDM = this.strFecha;
  }

  responsive(width: number): void {
    if (width >= 1024) { this.vertical = false; this.areaIzq = 'area-izq-borde'; this.areaDer = 'area-der'; return; }
    this.vertical = true; this.areaIzq = 'area-izq-ver'; this.areaDer = 'area-der-ver';
  }

  private procesoCalculaTotal(): void {
    this.txtDescuento = 0; this.txtPorDescuento = 0;
    this.prorrateaDescuento(); this.calculaTotalesFinal();
  }

  private prorrateaDescuento(valorIngresado?: number, origen?: number): void {
    if (!this.listaDetalles.length) { this.txtDescuento = 0; this.txtPorDescuento = 0; return; }
    let subtotal = 0;
    this.listaDetalles.forEach((r) => subtotal += Number(r.subTotal || 0));
    let dTotal = 0;
    if (origen === 1) dTotal = Math.max(0, valorIngresado || 0);
    else if (origen === 2) dTotal = Math.max(0, this.rd(subtotal * (valorIngresado || 0) / 100));
    let acum = 0;
    this.listaDetalles.forEach((r, idx) => {
      const proporcion = subtotal > 0 ? (r.subTotal / subtotal) : 0;
      const vP = idx === this.listaDetalles.length - 1 ? this.rd(dTotal - acum) : this.rd(dTotal * proporcion);
      acum += vP;
      r.descuento = vP;
      r.baseImponible = this.rd(r.subTotal - r.descuento);
      r.valorIVA = this.rd(r.baseImponible * r.porcentajeIVA / 100);
      r.total = this.rd(r.baseImponible + r.valorIVA);
    });
    const td = this.listaDetalles.reduce((s, r) => s + Number(r.descuento || 0), 0);
    this.txtDescuento = this.rd(td);
    this.txtPorDescuento = subtotal > 0 ? this.rd(this.txtDescuento * 100 / subtotal) : 0;
  }

  private calculaTotalesFinal(): void {
    let sub12 = 0; let sub0 = 0; let sub5 = 0; let sub8 = 0;
    let iva12 = 0; let iva5 = 0; let iva8 = 0;
    this.listaDetalles.forEach((r) => {
      const p = Number(r.porcentajeIVA || 0);
      const base = Number(r.baseImponible || 0);
      const iva = this.rd(base * p / 100);
      r.valorIVA = iva; r.total = this.rd(base + iva);
      if (p === 0) sub0 += base;
      else if (p === 5) { sub5 += base; iva5 += iva; }
      else if (p === 8) { sub8 += base; iva8 += iva; }
      else { sub12 += base; iva12 += iva; }
    });
    this.lbIVACero = this.rd(sub0); this.lbSubtotal5 = this.rd(sub5); this.lbSubtotal8 = this.rd(sub8); this.lbSubtotal = this.rd(sub12);
    this.lbTotalIVA5 = this.rd(iva5); this.lbTotalIVA8 = this.rd(iva8); this.lbTotalIVA = this.rd(iva12);
    this.lbTotal = this.rd(this.lbIVACero + this.lbSubtotal5 + this.lbSubtotal8 + this.lbSubtotal + this.lbTotalIVA5 + this.lbTotalIVA8 + this.lbTotalIVA + Number(this.txtPropina || 0));
    this.dataSourceDetalle.data = [...this.listaDetalles];
  }

  private limpiarIngreso(): void {
    this.lbIncluyeIva = ''; this.lbTipoIva = ''; this.lbTipoDescuento = '';
    this.productoSeleccionado.set(null); this.txtCantidad = 1; this.txtValor = 0; this.txtTotal = 0;
  }

  private cargarSesion(): void {
    const u = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');
    if (u) { try { this.vUsuario = JSON.parse(u) as Usuario; } catch { this.vUsuario = { codigo: 0 } as Usuario; } }
    const f = sessionStorage.getItem('facturador') || localStorage.getItem('facturador');
    if (f) { try { this.vFacturador = JSON.parse(f) as Facturador; } catch { this.vFacturador = {} as Facturador; } }
  }

  private cargarFacturadorYPtoEmision(): void {
    if (!this.vFacturador?.id) {
      this.facturadorService.getAll().subscribe({ next: (fs) => { const f = (fs || [])[0]; if (f) { this.vFacturador = f; this.cargarPuntosEmision(); } } });
      return;
    }
    this.cargarPuntosEmision();
  }

  private cargarPuntosEmision(): void {
    this.puntoEmisionService.getAll().subscribe({ next: (ps) => { const a = (ps || []).filter((p) => p.estado === 1); this.ptosEmision = a; this.ptoEmision = a[0] || null; } });
  }

  private cargarCatalogos(): void {
    this.detalleSriService.getAll().subscribe({
      next: (all) => {
        const d = (all || []).filter((x) => x.estado === 1);
        this.ivaOpciones = d.filter((x) => this.gTC(x.lsri) === TABLA_IVA);
        this.tablaSRIIVAGral = d.filter((x) => this.gTC(x.lsri) === IVA_GENERAL);
        this.tablaSRIFormasPago = d.filter((x) => this.gTC(x.lsri) === TABLA_FORMA_PAGO_SRI);
        this.aplicarIvaGeneralPorFecha();
        this.formaPagoSri = this.tablaSRIFormasPago.find((r) => r.codigo === SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO) || this.tablaSRIFormasPago[0] || null;
      },
    });
  }

  private aplicarIvaGeneralPorFecha(): void {
    if (!this.tablaSRIIVAGral.length) return;
    const fa = this.parseFechaLocal(this.strFecha);
    const a = this.tablaSRIIVAGral.find((r) => fa >= FECHA_CAMBIO_IVA && Number(r.porcentaje) >= 12);
    const an = this.tablaSRIIVAGral.find((r) => Number(r.porcentaje) < 12);
    const el = fa >= FECHA_CAMBIO_IVA ? a || this.tablaSRIIVAGral[0] : an || this.tablaSRIIVAGral[0];
    this.lbIvaGral = String(el.porcentaje || 0);
    this.nmIvaGral = Number(el.porcentaje || 0);
    this.nmCodigoIVASRI = Number(el.codigo || 0);
  }

  private parseFechaLocal(t: string | Date | null | undefined): Date {
    if (t instanceof Date) return t;
    const fechaTexto = String(t || '').trim();
    if (!fechaTexto) return new Date();
    if (fechaTexto.includes('/')) {
      const [d, m, a] = fechaTexto.split('/').map(Number);
      if (a && m && d) return new Date(a, m - 1, d);
    }
    const [a, m, d] = fechaTexto.split('-').map(Number);
    if (!a || !m || !d) return new Date(fechaTexto);
    return new Date(a, m - 1, d);
  }

  private getTablaCodigo(lsri: number | { tabla?: string }): string {
    if (typeof lsri === 'object' && lsri?.tabla) return String(lsri.tabla);
    return typeof lsri === 'number' ? String(lsri) : '';
  }

  private gTC(lsri: number | { tabla?: string }): string { return this.getTablaCodigo(lsri); }

  private rd(v: number, d = 2): number {
    const f = 10 ** d; return Math.round((Number(v || 0) + Number.EPSILON) * f) / f;
  }

  private parseError(error: unknown, fallback: string): string {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error && 'message' in error) return String((error as { message?: unknown }).message || fallback);
    return fallback;
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3500, panelClass: ['snackbar-success'], horizontalPosition: 'center', verticalPosition: 'bottom' });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 4500, panelClass: ['snackbar-error'], horizontalPosition: 'center', verticalPosition: 'bottom' });
  }
}
