import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { ProductoSelectorDialogComponent } from '../../../../../shared/components/producto-selector-dialog/producto-selector-dialog.component';
import { FacturaSelectorDialogComponent } from '../../../../../shared/components/factura-selector-dialog/factura-selector-dialog.component';
import { FacturaEmitir } from '../../../model/factura-emitir';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { Usuario } from '../../../../../shared/model/usuario';
import { NotaDebitoEmitir } from '../../../model/nota-debito-emitir';
import { DetalleNotaDebitoEmitir } from '../../../model/detalle-nota-debito-emitir';
import { Titular } from '../../../../tsr/model/titular';
import { Facturador } from '../../../model/facturador';
import { PuntoEmision } from '../../../model/puntos-emision';
import { ProductoCobro } from '../../../model/producto-cobro';
import { DetalleSri } from '../../../model/detalle-sri';
import { NotaDebitoEmitirService } from '../../../service/emitir/nota-debito-emitir.service';
import { FacturadorService } from '../../../service/facturador.service';
import { PuntoEmisionService } from '../../../service/punto-emision.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

const IVA_GENERAL = '614';
const TABLA_IVA = '17';
const TABLA_FORMA_PAGO_SRI = '24';
const NOTA_DEBITO = '05';
const FECHA_CAMBIO_IVA = new Date('2024-04-01');
const SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO = '01';

@Component({
  selector: 'app-notas-debito',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './notas-debito.component.html',
  styleUrl: './notas-debito.component.scss',
})
export class NotasDebitoComponent implements OnInit {
  @ViewChild('inCantidad') inCantidad!: ElementRef;
  @ViewChild('fechaNdInput', { read: ElementRef }) fechaNdInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaNdDMInput', { read: ElementRef }) fechaNdDMInputRef!: ElementRef<HTMLInputElement>;

  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private service = inject(NotaDebitoEmitirService);
  private facturadorService = inject(FacturadorService);
  private puntoEmisionService = inject(PuntoEmisionService);
  private detalleSriService = inject(DetalleSriService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private jasperReportes = inject(JasperReportesService);

  cargando = signal(false);
  guardando = signal(false);
  documentoActual = signal<NotaDebitoEmitir | null>(null);
  registroId: number | null = null;
  deshabilitado = false;

  personaSeleccionada = signal<Titular | null>(null);
  textoTitularSeleccionado = computed(() => this.displayPersona(this.personaSeleccionada()));
  readonly rolClienteCodigo = 1;
  readonly documentoNombre = 'Nota de Débito';

  vFacturador = {} as Facturador;
  vUsuario = { codigo: 0 } as Usuario;
  ptosEmision: PuntoEmision[] = [];
  ptoEmision: PuntoEmision | null = null;

  ivaOpciones: DetalleSri[] = [];
  tablaSRIIVAGral: DetalleSri[] = [];
  tablaSRIFormasPago: DetalleSri[] = [];
  formaPagoSri: DetalleSri | null = null;

  fechaControl = new UntypedFormControl(new Date());
  observacion = '';
  plazoPago = 1;
  facturaRelacionada = signal<FacturaEmitir | null>(null);
  tipoDocModificado = '01';
  numDocModificado = '';
  fechaDMControl = new UntypedFormControl(null);

  nmIvaGral = 15;
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

  txtDescuento = 0;
  txtPropina = 0;

  lbSubtotal = 0;
  lbIVACero = 0;
  lbTotalIVA = 0;
  lbTotal = 0;

  listaDetalles: DetalleNotaDebitoEmitir[] = [];
  dataSource = new MatTableDataSource<DetalleNotaDebitoEmitir>([]);
  columnas = ['cantidad', 'descripcion', 'valor', 'subTotal', 'descuento', 'baseImponible', 'iva', 'total', 'acciones'];

  registros = signal<NotaDebitoEmitir[]>([]);
  dataSourceRegistros = new MatTableDataSource<NotaDebitoEmitir>([]);
  columnasRegistros = ['id', 'fecha', 'numero', 'persona', 'total', 'estado'];

  vertical = false;
  areaIzq = 'area-izq-borde';
  areaDer = 'area-der';

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
    return this.documentoActual()?.id ? 'Nota emitida' : 'Emitir nota de débito';
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
      error: () => { this.mostrarError('No se pudieron cargar las notas de débito'); this.cargando.set(false); },
    });
  }

  buscaCliente(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px', maxWidth: '98vw',
      data: { rolCodigo: this.rolClienteCodigo, rolNombre: 'CLIENTE', titulo: 'Buscar Cliente' },
    });
    dialogRef.afterClosed().subscribe((t: Titular | null) => { if (t) this.personaSeleccionada.set(t); });
  }

  limpiarCliente(): void { this.personaSeleccionada.set(null); this.limpiarFacturaRelacionada(); }

  buscaFacturaRelacionada(): void {
    const cliente = this.personaSeleccionada();
    if (!cliente?.codigo) { this.mostrarError('Primero seleccione un cliente'); return; }
    const dialogRef = this.dialog.open(FacturaSelectorDialogComponent, {
      width: '900px', maxWidth: '98vw',
      data: { codigoTitular: cliente.codigo, nombreTitular: this.displayPersona(cliente) },
    });
    dialogRef.afterClosed().subscribe((factura: FacturaEmitir | null) => {
      if (factura) this.asignarFacturaRelacionada(factura);
    });
  }

  limpiarFacturaRelacionada(): void {
    this.facturaRelacionada.set(null);
    this.numDocModificado = '';
    this.fechaDMControl.setValue(null, { emitEvent: false });
    this.productoSeleccionado.set(null);
  }

  asignarFacturaRelacionada(factura: FacturaEmitir): void {
    this.facturaRelacionada.set(factura);
    this.tipoDocModificado = '01';
    this.numDocModificado = factura.numero || '';
    const fechaFact = factura.fecha ? new Date(factura.fecha) : new Date();
    this.fechaDMControl.setValue(fechaFact, { emitEvent: false });
  }

  displayFacturaRelacionada(): string {
    const f = this.facturaRelacionada();
    if (!f) return '';
    return f.numero ? f.numero : `ID: ${f.id}`;
  }

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
    const totalItem = this.rd(baseImponible + valorIVA);

    const item = {
      id: null as unknown as number, notaDebito: {} as NotaDebitoEmitir,
      descripcion: prod.nombre || '', cantidad, valor, subTotal, descuento, baseImponible,
      porcentajeIVA, valorIVA, porcentajeICE: 0, valorICE: 0, subsidio: 0,
      total: totalItem, producto: prod, estado: 1,
    } as DetalleNotaDebitoEmitir;

    this.listaDetalles.push(item);
    this.dataSource.data = [...this.listaDetalles];
    this.procesoCalculaTotal();
    this.limpiarIngreso();
  }

  eliminaDetalle(item: DetalleNotaDebitoEmitir): void {
    this.listaDetalles = this.listaDetalles.filter((d) => d !== item);
    this.dataSource.data = [...this.listaDetalles];
    this.procesoCalculaTotal();
  }

  private procesoCalculaTotal(): void {
    let sub = 0; let sub0 = 0; let iva = 0;
    this.listaDetalles.forEach((r) => {
      const base = Number(r.baseImponible || 0);
      const ivaR = this.rd(base * Number(r.porcentajeIVA || 0) / 100);
      r.valorIVA = ivaR; r.total = this.rd(base + ivaR);
      if (Number(r.porcentajeIVA || 0) === 0) sub0 += base;
      else { sub += base; iva += ivaR; }
    });
    this.lbSubtotal = this.rd(sub);
    this.lbIVACero = this.rd(sub0);
    this.lbTotalIVA = this.rd(iva);
    this.lbTotal = this.rd(this.lbSubtotal + this.lbIVACero + this.lbTotalIVA + Number(this.txtPropina || 0) - Number(this.txtDescuento || 0));
    this.dataSource.data = [...this.listaDetalles];
  }

  generaNotaDebito(): void {
    if (this.documentoActual()?.id) { this.mostrarError('La nota de débito ya fue emitida'); return; }
    if (!this.listaDetalles.length) { this.mostrarError('Nota de débito sin detalle'); return; }
    if (!this.personaSeleccionada()?.codigo) { this.mostrarError('Debe seleccionar un cliente para continuar'); return; }
    if (!this.ptoEmision?.id) { this.mostrarError('No existe punto de emisión configurado'); return; }
    if (!this.facturaRelacionada()) { this.mostrarError('Seleccione la factura relacionada (documento modificado)'); return; }

    const comprador = this.personaSeleccionada() as Titular;
    const fechaDoc = this.parseFechaLocal(this.fechaControl.value);
    const fechaDM = this.parseFechaLocal(this.fechaDMControl.value);

    const payload: any = {
      notaDebito: {
        facturador:        this.vFacturador,
        titular:           comprador,
        ptoEmision:        this.ptoEmision,
        factura:           { id: this.facturaRelacionada()!.id },
        usuario:           this.vUsuario,
        tipoComprobante:   NOTA_DEBITO,
        tipoDoc:           '04',
        numero:            '',
        numEstablecimiento: this.ptoEmision!.establecimiento?.codigo || '',
        numPtoEmision:     this.ptoEmision!.codigo || '',
        secuencial:        '',
        ambiente:          1,
        clave:             '',
        fecha:             fechaDoc,
        fechaEmisionDM:    fechaDM,
        tipoDocModificado: this.tipoDocModificado,
        numDocModificado:  this.numDocModificado.trim(),
        observacion:       this.observacion,
        subtotal:          this.lbSubtotal,
        subcero:           this.lbIVACero,
        pIVA:              this.nmIvaGral,
        vIVA:              this.lbTotalIVA,
        vICE:              0,
        vIRBPNR:           0,
        descuento:         this.txtDescuento,
        porDescuento:      0,
        propina:           this.txtPropina,
        subsidio:          0,
        total:             this.lbTotal,
        pathGen:           '',
        autorizacion:      '',
        fechaAutorizacion: '',
        estado:            1,
        estadoEmision:     1,
        comprador: {
          id:    comprador.codigo,
          email: comprador.email || '',
        },
      },
      detalles: this.listaDetalles.map((d) => ({
        producto:      d.producto?.id ?? d.producto,
        descripcion:   d.descripcion,
        cantidad:      d.cantidad,
        valor:         d.valor,
        subTotal:      d.subTotal,
        descuento:     d.descuento,
        baseImponible: d.baseImponible,
        porcentajeIVA: d.porcentajeIVA,
        valorIVA:      d.valorIVA,
        total:         d.total,
      })),
    };

    this.guardando.set(true);
    this.service.procesarCompleta(payload).subscribe({
      next: (resp) => {
        this.deshabilitado = true;
        this.fechaControl.disable(); this.fechaDMControl.disable();
        this.guardando.set(false);
        this.mostrarExito('Nota de débito generada correctamente');
        const idNd = resp?.id;
        if (idNd) {
          this.documentoActual.set(resp);
          this.registroId = idNd;
          this.service.getById(String(idNd)).subscribe({
            next: (ndCompleta) => { if (ndCompleta?.id) { this.documentoActual.set(ndCompleta); this.registroId = ndCompleta.id; } },
            error: () => {},
          });
        } else {
          // Fallback: backend retornó null (200 sin body JSON); buscar por titular
          this.buscarNdRecienEmitida(this.personaSeleccionada()?.codigo ?? 0);
        }
        this.cargarRegistros();
      },
      error: (err) => { this.guardando.set(false); this.mostrarError(this.parseError(err, 'No se pudo grabar la nota de débito')); },
    });
  }

  private buscarNdRecienEmitida(codigoTitular: number): void {
    if (!codigoTitular) return;
    const criterios: DatosBusqueda[] = [];
    const cTitular = new DatosBusqueda();
    cTitular.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG, 'titular', 'codigo', String(codigoTitular), TipoComandosBusqueda.IGUAL
    );
    cTitular.setNumeroCampoRepetido(0);
    criterios.push(cTitular);
    this.service.selectByCriteria(criterios).subscribe({
      next: (lista) => {
        const sorted = (lista || []).sort((a, b) => (b.id || 0) - (a.id || 0));
        if (sorted[0]?.id) {
          this.documentoActual.set(sorted[0]);
          this.registroId = sorted[0].id;
        }
      },
      error: () => {},
    });
  }

  nueva(): void {
    this.documentoActual.set(null); this.registroId = null; this.deshabilitado = false;
    this.fechaControl.enable(); this.fechaDMControl.enable();
    this.listaDetalles = []; this.dataSource.data = [];
    this.setFecha();
    this.lbSubtotal = 0; this.lbIVACero = 0; this.lbTotalIVA = 0; this.lbTotal = 0;
    this.txtDescuento = 0; this.txtPropina = 0; this.observacion = '';
    this.numDocModificado = ''; this.tipoDocModificado = '01'; this.fechaDMControl.setValue(null, { emitEvent: false }); this.facturaRelacionada.set(null);
    this.limpiarIngreso();
    this.limpiarCliente();
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  imprimirDocumento(): void {
    const id = this.documentoActual()?.id;
    if (!id) { this.mostrarError('Primero debe emitir el documento'); return; }
    this.jasperReportes.generar('cxc', 'RPRT_RIDE_NOTA_DEBITO', { P_ID_NOTA_DEBITO: id }, 'PDF').subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      error: () => this.mostrarError('No se pudo generar el reporte'),
    });
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
    this.fechaControl.setValue(new Date(), { emitEvent: false });
    if (!this.fechaDMControl.value) this.fechaDMControl.setValue(new Date(), { emitEvent: false });
  }

  private _rawFecha: string = '';
  private _rawFechaDM: string = '';

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
          if (this.fechaNdInputRef?.nativeElement) this.fechaNdInputRef.nativeElement.value = formatted;
          this.aplicarIvaGeneralPorFecha();
        });
      }
    }
  }

  onFechaPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.fechaControl.setValue(d, { emitEvent: false });
    const formatted = this.funcionesDatosS.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaNdInputRef?.nativeElement) this.fechaNdInputRef.nativeElement.value = formatted;
    });
    this.aplicarIvaGeneralPorFecha();
  }

  capturarFechaDMRaw(event: Event): void {
    this._rawFechaDM = (event.target as HTMLInputElement).value;
  }

  syncFechaDMFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaDM || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaDM = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.fechaDMControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaNdDMInputRef?.nativeElement) this.fechaNdDMInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaEmiDMPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.fechaDMControl.setValue(d, { emitEvent: false });
    const formatted = this.funcionesDatosS.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaNdDMInputRef?.nativeElement) this.fechaNdDMInputRef.nativeElement.value = formatted;
    });
  }

  responsive(width: number): void {
    if (width >= 1024) { this.vertical = false; this.areaIzq = 'area-izq-borde'; this.areaDer = 'area-der'; return; }
    this.vertical = true; this.areaIzq = 'area-izq-ver'; this.areaDer = 'area-der-ver';
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
    const fa = this.parseFechaLocal(this.fechaControl.value);
    const a = this.tablaSRIIVAGral.find((r) => fa >= FECHA_CAMBIO_IVA && Number(r.porcentaje) >= 12);
    const an = this.tablaSRIIVAGral.find((r) => Number(r.porcentaje) < 12);
    const el = fa >= FECHA_CAMBIO_IVA ? a || this.tablaSRIIVAGral[0] : an || this.tablaSRIIVAGral[0];
    this.lbIvaGral = String(el.porcentaje || 0);
    this.nmIvaGral = Number(el.porcentaje || 0);
  }

  /** Convierte el formato LocalDateTime del backend ("2026,7,22,...") a Date. */
  parseFechaArray(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const str = String(value).trim();
    if (str.includes(',')) {
      const parts = str.split(',').map(Number);
      const [year, month, day, hour = 0, min = 0, sec = 0] = parts;
      if (year && month && day) return new Date(year, month - 1, day, hour, min, sec);
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
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

  private gTC(lsri: number | { tabla?: string }): string {
    if (typeof lsri === 'object' && lsri?.tabla) return String(lsri.tabla);
    return typeof lsri === 'number' ? String(lsri) : '';
  }

  private limpiarIngreso(): void {
    this.lbIncluyeIva = ''; this.lbTipoIva = ''; this.lbTipoDescuento = '';
    this.productoSeleccionado.set(null); this.txtCantidad = 1; this.txtValor = 0; this.txtTotal = 0;
  }

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
