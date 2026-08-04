import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { RetencionV2Emitir } from '../../../model/retencion-v2-emitir';
import { DetalleRetencionV2Emitir } from '../../../model/detalle-retencion-v2-emitir';
import { Titular } from '../../../../tsr/model/titular';
import { Facturador } from '../../../model/facturador';
import { PuntoEmision } from '../../../model/puntos-emision';
import { DetalleSri } from '../../../model/detalle-sri';
import { FacturaCompra } from '../../../../cxp/model/factura-compra';
import { NotaDebitoCompra } from '../../../../cxp/model/nota-debito-compra';
import { NotaCreditoCompra } from '../../../../cxp/model/nota-credito-compra';
import { RetencionV2EmitirService } from '../../../service/emitir/retencion-v2-emitir.service';
import { FacturadorService } from '../../../service/facturador.service';
import { PuntoEmisionService } from '../../../service/punto-emision.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';
import { FacturaCompraService } from '../../../../cxp/service/factura-compra.service';
import { NotaDebitoCompraService } from '../../../../cxp/service/nota-debito-compra.service';
import { NotaCreditoCompraService } from '../../../../cxp/service/nota-credito-compra.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

const TABLA_TIPO_DOC = '3';             // Tipos de documentos (LSRI 3)
const TABLA_IMPUESTO = '19';            // Impuestos retención (LSRI 19)
const TABLA_PORCENTAJE_IVA_R = '20';   // % Retención IVA (LSRI 20)
const TABLA_PORCENTAJE_IR = '615';     // % Retención Renta vigente desde mar-2024 (LSRI 615)
const TABLA_PORCENTAJE_ISD = '15';     // % Retención ISD
const TABLA_FORMA_PAGO = '610';        // Formas de pago SRI (LSRI 610)

@Component({
  selector: 'app-retencionesv2',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './retencionesv2.component.html',
  styleUrl: './retencionesv2.component.scss',
})
export class Retencionesv2Component implements OnInit {
  @ViewChild('fechaRetencionV2Input', { read: ElementRef }) fechaRetencionV2InputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaEmiDocV2Input', { read: ElementRef }) fechaEmiDocV2InputRef!: ElementRef<HTMLInputElement>;

  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private service = inject(RetencionV2EmitirService);
  private facturadorService = inject(FacturadorService);
  private puntoEmisionService = inject(PuntoEmisionService);
  private detalleSriService = inject(DetalleSriService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private jasperReportes = inject(JasperReportesService);
  private facturaCompraService = inject(FacturaCompraService);
  private notaDebitoCompraService = inject(NotaDebitoCompraService);
  private notaCreditoCompraService = inject(NotaCreditoCompraService);

  cargando = signal(false);
  guardando = signal(false);
  documentoActual = signal<RetencionV2Emitir | null>(null);
  deshabilitado = false;

  personaSeleccionada = signal<Titular | null>(null);
  textoTitularSeleccionado = computed(() => this.displayPersona(this.personaSeleccionada()));
  readonly rolProveedorCodigo = 2;
  readonly documentoNombre = 'Retención';

  vFacturador = {} as Facturador;
  vUsuario: any = { codigo: 0 };
  ptosEmision: PuntoEmision[] = [];
  ptoEmision: PuntoEmision | null = null;

  tablaTiposDoc: DetalleSri[] = [];
  tablaImpuestos: DetalleSri[] = [];
  tablaPorcentajesIR: DetalleSri[] = [];
  tablaPorcentajesIVA: DetalleSri[] = [];
  tablaPorcentajesISD: DetalleSri[] = [];
  tablaPorcentajes: DetalleSri[] = [];
  tablaFormasPago: DetalleSri[] = [];

  idDocumento: DetalleSri | null = null;
  idImpuesto: DetalleSri | null = null;
  idPorcentaje: DetalleSri | null = null;
  idFormaPago: DetalleSri | null = null;
  numDocReten = '';
  drAutorizacion = '';
  fechaEmiDocControl = new UntypedFormControl(null);
  txtBaseImponible = 0;
  txtPorcentaje = 0;
  txtValorReten = 0;

  // Documento retenido seleccionado del combo CXP
  documentoRetenidoSeleccionado: (FacturaCompra | NotaDebitoCompra | NotaCreditoCompra) | null = null;
  documentosDisponibles = signal<Array<FacturaCompra | NotaDebitoCompra | NotaCreditoCompra>>([]);
  cargandoDocumentos = signal(false);

  docResTSinImpuestos = 0;
  docResIVACero = 0;
  docResPorIVA = 0;
  docResTotalIVA = 0;
  docResTotal = 0;

  fechaControl = new UntypedFormControl(new Date());
  periodoFiscal = '';
  observacion = '';
  totalRetenido = 0;

  listaDetalles: DetalleRetencionV2Emitir[] = [];
  dataSource = new MatTableDataSource<DetalleRetencionV2Emitir>([]);
  columnas = ['tipoDoc', 'numDoc', 'autorizacion', 'fechaEmision', 'impuesto', 'codReten', 'baseImponible', 'porcentaje', 'valor', 'acciones'];

  vertical = false;

  @HostListener('window:resize')
  onResize(): void { this.responsive(window.innerWidth); }

  ngOnInit(): void {
    this.cargarSesion();
    this.setFecha();
    this.responsive(window.innerWidth);
    this.cargarCatalogos();
    this.cargarFacturadorYPtoEmision();
  }

  get accionPrincipal(): string {
    return this.documentoActual()?.id ? 'Retención emitida' : 'Emitir Retención';
  }

  buscaProveedor(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px', maxWidth: '98vw',
      data: { rolCodigo: this.rolProveedorCodigo, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    });
    dialogRef.afterClosed().subscribe((t: Titular | null) => {
      if (t) {
        this.personaSeleccionada.set(t);
        // Si ya hay tipo de documento seleccionado, cargar documentos del proveedor
        if (this.idDocumento) this.onCambioTipoDocRetenido();
      }
    });
  }

  limpiarProveedor(): void {
    this.personaSeleccionada.set(null);
    this.documentosDisponibles.set([]);
    this.documentoRetenidoSeleccionado = null;
    this.limpiarCamposDocRetenido();
  }

  displayPersona(persona: Titular | null): string {
    if (!persona) return '';
    return `${persona.identificacion || ''} - ${persona.razonSocial || persona.nombre || ''}`.trim();
  }

  onCambioTipoDocRetenido(): void {
    this.documentoRetenidoSeleccionado = null;
    this.documentosDisponibles.set([]);
    this.limpiarCamposDocRetenido();

    const proveedor = this.personaSeleccionada();
    if (!proveedor?.codigo || !this.idDocumento?.codigo) return;

    const codigoTipo = this.idDocumento.codigo;
    // Solo cargamos desde CXP para los tipos que tienen tabla de compra
    const TIPO_FACTURA       = '01';
    const TIPO_NOTA_CREDITO  = '04';
    const TIPO_NOTA_DEBITO   = '05';

    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG, 'titular', 'codigo', String(proveedor.codigo), TipoComandosBusqueda.IGUAL
    );
    criterio.setNumeroCampoRepetido(0);

    this.cargandoDocumentos.set(true);

    if (codigoTipo === TIPO_FACTURA) {
      this.facturaCompraService.selectByCriteria([criterio]).subscribe({
        next: (docs) => { this.documentosDisponibles.set((docs || []) as any[]); this.cargandoDocumentos.set(false); },
        error: () => { this.mostrarError('No se pudieron cargar las facturas del proveedor'); this.cargandoDocumentos.set(false); },
      });
    } else if (codigoTipo === TIPO_NOTA_CREDITO) {
      this.notaCreditoCompraService.selectByCriteria([criterio]).subscribe({
        next: (docs) => { this.documentosDisponibles.set((docs || []) as any[]); this.cargandoDocumentos.set(false); },
        error: () => { this.mostrarError('No se pudieron cargar las notas de crédito del proveedor'); this.cargandoDocumentos.set(false); },
      });
    } else if (codigoTipo === TIPO_NOTA_DEBITO) {
      this.notaDebitoCompraService.selectByCriteria([criterio]).subscribe({
        next: (docs) => { this.documentosDisponibles.set((docs || []) as any[]); this.cargandoDocumentos.set(false); },
        error: () => { this.mostrarError('No se pudieron cargar las notas de débito del proveedor'); this.cargandoDocumentos.set(false); },
      });
    } else {
      // Tipo sin tabla CXP: el usuario ingresa manual
      this.cargandoDocumentos.set(false);
    }
  }

  onSelectDocumentoRetenido(doc: FacturaCompra | NotaDebitoCompra | NotaCreditoCompra | null): void {
    if (!doc) { this.limpiarCamposDocRetenido(); return; }
    this.numDocReten = doc.numero || '';
    this.drAutorizacion = (doc as FacturaCompra).autorizacion || (doc as FacturaCompra).clave || '';
    const fechaDoc = this.parseIsoArrayDate(doc.fecha);
    this.fechaEmiDocControl.setValue(fechaDoc, { emitEvent: false });
    if (this.fechaEmiDocV2InputRef?.nativeElement) {
      this.fechaEmiDocV2InputRef.nativeElement.value =
        this.funcionesDatosS.formatoFecha(fechaDoc, FuncionesDatosService.SOLO_FECHA) || '';
    }
    // FacturaCompra: subtotal = base IVA gravado, subcero = base IVA cero
    const fac = doc as FacturaCompra;
    const subtotal = Number(fac.subtotal || 0);
    const subcero  = Number(fac.subcero  || 0);
    const vIVA     = Number(fac.vIVA     || 0);
    const total    = Number(fac.total    || 0);
    const pIVA     = Number(fac.pIVA     || 0);
    this.docResIVACero       = this.rd(subcero);
    this.docResTSinImpuestos = this.rd(subtotal + subcero);  // Total sin impuestos = base gravada + base cero
    this.docResPorIVA        = this.rd(pIVA);
    this.docResTotalIVA      = this.rd(vIVA);
    this.docResTotal         = this.rd(total);
    // Rellenar base imponible según el impuesto actualmente seleccionado (sin resetear porcentaje)
    this.actualizarBaseImponible();
    // Forma de pago: intentar mapear por código si existe
    if ((fac as any).formaPago && this.tablaFormasPago.length) {
      const fpCod = String((fac as any).formaPago);
      const fp = this.tablaFormasPago.find(f => String(f.id) === fpCod || f.codigo === fpCod);
      if (fp) this.idFormaPago = fp;
    }
  }

  displayDocumento(doc: FacturaCompra | NotaDebitoCompra | NotaCreditoCompra): string {
    const num = doc.numero || `ID:${doc.id}`;
    const fecha = this.parseIsoArrayDate(doc.fecha);
    const fechaStr = `${String(fecha.getDate()).padStart(2,'0')}/${String(fecha.getMonth()+1).padStart(2,'0')}/${fecha.getFullYear()}`;
    return `${num}  |  ${fechaStr}  |  $${Number(doc.total || 0).toFixed(2)}`;
  }

  /** Convierte fecha ISO o array LocalDateTime del backend a Date. */
  parseIsoArrayDate(value: string | null | undefined): Date {
    if (!value) return new Date();
    const str = String(value).trim();
    if (str.includes(',')) {
      const parts = str.split(',').map(Number);
      const [y, mo, d, h = 0, mi = 0, s = 0] = parts;
      if (y && mo && d) return new Date(y, mo - 1, d, h, mi, s);
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private limpiarCamposDocRetenido(): void {
    this.numDocReten = ''; this.drAutorizacion = '';
    this.fechaEmiDocControl.setValue(this.fechaControl.value, { emitEvent: false });
    this.docResTSinImpuestos = 0; this.docResIVACero = 0;
    this.docResPorIVA = 0; this.docResTotalIVA = 0; this.docResTotal = 0;
  }

  onCambioImpuesto(): void {
    if (!this.idImpuesto) { this.tablaPorcentajes = []; this.idPorcentaje = null; return; }
    const cod = this.idImpuesto.codigo;
    if (cod === '1') this.tablaPorcentajes = [...this.tablaPorcentajesIR];
    else if (cod === '2') this.tablaPorcentajes = [...this.tablaPorcentajesIVA];
    else if (cod === '6') this.tablaPorcentajes = [...this.tablaPorcentajesISD];
    else this.tablaPorcentajes = [];
    this.idPorcentaje = null;
    this.txtPorcentaje = 0;
    this.actualizarBaseImponible();
  }

  /** Rellena txtBaseImponible según el impuesto seleccionado y los valores del documento retenido. */
  private actualizarBaseImponible(): void {
    if (!this.idImpuesto) return;
    if (this.docResTSinImpuestos <= 0 && this.docResTotal <= 0) return; // sin documento
    const cod = this.idImpuesto.codigo;
    if (cod === '1') {
      // Renta: base = total sin impuestos (subcero + subtotal)
      this.txtBaseImponible = this.rd(this.docResTSinImpuestos);
    } else if (cod === '2') {
      // IVA: base = solo la parte gravada con IVA (total sin impuestos - base IVA cero)
      this.txtBaseImponible = this.rd(this.docResTSinImpuestos - this.docResIVACero);
    } else if (cod === '6') {
      // ISD: base = total del documento
      this.txtBaseImponible = this.rd(this.docResTotal);
    }
    this.calcularValorReten();
  }

  onCambioPorcentaje(): void {
    if (!this.idPorcentaje) { this.txtPorcentaje = 0; return; }
    this.txtPorcentaje = Number(this.idPorcentaje.porcentaje || 0);
    this.calcularValorReten();
  }

  calcularValorReten(): void {
    this.txtValorReten = this.rd(this.txtBaseImponible * this.txtPorcentaje / 100);
  }

  formatearPeriodoFiscal(): void {
    const actual = String(this.periodoFiscal || '').replace(/[^\d]/g, '').slice(0, 6);
    this.periodoFiscal = actual.length > 2 ? `${actual.slice(0, 2)}/${actual.slice(2)}` : actual;
  }

  obtenerFiscal(): void {
    const fecha = this.parseFechaLocal(this.fechaControl.value);
    if (Number.isNaN(fecha.getTime())) {
      return;
    }
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    this.periodoFiscal = `${mes}/${fecha.getFullYear()}`;
  }

  addDetalle(): void {
    if (!this.idDocumento?.codigo) { this.mostrarError('Seleccione el tipo de documento retenido'); return; }
    if (!this.numDocReten.trim()) { this.mostrarError('Ingrese el número del documento retenido'); return; }
    if (!this.idImpuesto?.codigo) { this.mostrarError('Seleccione el impuesto'); return; }
    if (!this.idPorcentaje?.codigo) { this.mostrarError('Seleccione el código de retención'); return; }
    if (this.txtBaseImponible <= 0) { this.mostrarError('La base imponible debe ser mayor que 0'); return; }

    const item: DetalleRetencionV2Emitir = {
      id: null as unknown as number,
      retencionv2: {} as RetencionV2Emitir,
      tipoDocReten: this.idDocumento.codigo,
      numDocReten: this.numDocReten.trim(),
      fechaEmiDoc: this.parseFechaLocal(this.fechaEmiDocControl.value),
      codImpuesto: this.idImpuesto.codigo,
      codRetencion: this.idPorcentaje.codigo,
      baseImponible: this.rd(this.txtBaseImponible),
      porcentajeReten: this.rd(this.txtPorcentaje),
      valorReten: this.rd(this.txtValorReten),
      fechaReg: new Date(),
      docResAutorizacion: this.drAutorizacion,
      docResForPago: this.idFormaPago?.codigo || '',
      docResTSinImpuestos: this.rd(this.docResTSinImpuestos),
      docResIVACero: this.rd(this.docResIVACero),
      docResPorIVA: this.rd(this.docResPorIVA),
      docResTotalIVA: this.rd(this.docResTotalIVA),
      docResTotal: this.rd(this.docResTotal),
      estado: 1,
    };

    this.listaDetalles.push(item);
    this.dataSource.data = [...this.listaDetalles];
    this.calcularTotalRetenido();
    this.limpiarDetalle();
  }

  eliminaDetalle(item: DetalleRetencionV2Emitir): void {
    this.listaDetalles = this.listaDetalles.filter((d) => d !== item);
    this.dataSource.data = [...this.listaDetalles];
    this.calcularTotalRetenido();
  }

  generaRetencionV2(): void {
    if (this.documentoActual()?.id) { this.mostrarError('La retención ya fue emitida'); return; }
    if (!this.listaDetalles.length) { this.mostrarError('Retención sin detalle'); return; }
    if (!this.personaSeleccionada()?.codigo) { this.mostrarError('Debe seleccionar un proveedor'); return; }
    if (!this.ptoEmision?.id) { this.mostrarError('No existe punto de emisión configurado'); return; }
    if (!this.periodoFiscal.trim()) { this.mostrarError('Ingrese el período fiscal (MM/YYYY)'); return; }

    const fechaDoc = this.parseFechaLocal(this.fechaControl.value);

    const payload: any = {
      retencion: {
        facturador:          { id: this.vFacturador.id },
        proveedor:           { codigo: (this.personaSeleccionada() as Titular).codigo },
        ptoEmision:          this.ptoEmision,
        usuario:             this.vUsuario,
        fecha:               fechaDoc,
        periodoFiscal:       this.periodoFiscal,
        observacion:         this.observacion,
        total:               this.totalRetenido,
        autorizacion:        '',
        clave:               '',
        pathGen:             '',
        estado:              1,
        estadoEmision:       1,
        detalleRetencionV2:  this.listaDetalles.map((item) => ({ ...item })),
      },
    };

    this.guardando.set(true);
    this.service.procesarCompleta(payload).subscribe({
      next: (resp: any) => {
        this.guardando.set(false);

        // HTTP 200 + exito === false → SRI no autorizó, pero el registro quedó guardado en BD
        if (resp?.exito === false) {
          this.mostrarAdvertencia(resp.mensaje || 'La retención fue guardada pero no fue autorizada por el SRI.');
          // El registro quedó guardado; asignar id si viene para habilitar impresión
          if (resp.idRetencion) {
            this.documentoActual.set({ id: resp.idRetencion, autorizacion: resp.autorizacion, clave: resp.claveAcceso } as any);
            this.deshabilitado = true;
            this.fechaControl.disable(); this.fechaEmiDocControl.disable();
          }
          return;
        }

        // HTTP 200 + exito === true → autorizado correctamente
        if (resp?.exito === true) {
          this.documentoActual.set({ id: resp.idRetencion, autorizacion: resp.autorizacion, clave: resp.claveAcceso } as any);
          this.deshabilitado = true;
          this.fechaControl.disable(); this.fechaEmiDocControl.disable();
          this.mostrarExito(resp.mensaje || 'Retención autorizada correctamente');
          return;
        }

        // Respuesta directa (objeto retención sin envolver — formato legacy)
        if (resp?.id) {
          this.documentoActual.set(resp);
          this.deshabilitado = true;
          this.fechaControl.disable(); this.fechaEmiDocControl.disable();
          this.mostrarExito('Retención generada correctamente');
          return;
        }

        // null o respuesta inesperada
        this.mostrarError('No se pudo emitir la retención. Verifique los datos e inténtelo nuevamente.');
      },
      error: (err: any) => {
        // El servicio hace throwError(() => error.error), así que err ES el body JSON:
        // { exito, etapa, mensaje, erroresContables?, error? }
        this.guardando.set(false);
        const etapa: string = err?.etapa ?? '';

        if (etapa === 'VALIDACION_CONTABLE') {
          if (Array.isArray(err?.erroresContables) && err.erroresContables.length) {
            const lista = (err.erroresContables as string[]).map((e: string) => `• ${e}`).join('\n');
            this.mostrarError(`Faltan cuentas contables configuradas:\n${lista}`);
          } else {
            this.mostrarError(err?.mensaje || 'No se puede emitir: faltan cuentas contables.');
          }
        } else if (etapa === 'XML_DEVUELTO') {
          this.mostrarError(err?.mensaje || 'El SRI rechazó el XML por errores de formato.');
        } else if (etapa === 'PARAMETROS') {
          this.mostrarError(err?.mensaje || 'Parámetros incorrectos o faltantes.');
        } else {
          // GRABADO_RETENCION, GRABADO_DETALLES, GENERACION_XML, ERROR_AUTORIZACION_SRI, ERROR_INESPERADO
          this.mostrarError(err?.mensaje || err?.error || 'No se pudo grabar la retención. Intente nuevamente.');
        }
      },
    });
  }

  nueva(): void {
    this.documentoActual.set(null);
    this.deshabilitado = false;
    this.fechaControl.enable(); this.fechaEmiDocControl.enable();
    this.listaDetalles = [];
    this.dataSource.data = [];
    this.setFecha();
    this.observacion = '';
    this.totalRetenido = 0;
    this.idDocumento = null; this.idFormaPago = null;
    this.limpiarDetalle();
    this.limpiarProveedor();
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  imprimirDocumento(): void {
    const id = this.documentoActual()?.id;
    if (!id) { this.mostrarError('Primero debe emitir la retención'); return; }
    this.jasperReportes.generar('cxc', 'RPRT_RIDE_RETENCION_V2', { P_ID_RETENCION_V2: id }, 'PDF').subscribe({
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

  setFecha(): void {
    this.fechaControl.setValue(new Date(), { emitEvent: false });
    this.obtenerFiscal();
    if (!this.fechaEmiDocControl.value) this.fechaEmiDocControl.setValue(new Date(), { emitEvent: false });
  }

  private _rawFecha: string = '';
  private _rawFechaEmiDoc: string = '';

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
          if (this.fechaRetencionV2InputRef?.nativeElement) this.fechaRetencionV2InputRef.nativeElement.value = formatted;
          this.obtenerFiscal();
        });
      }
    }
  }

  onFechaPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.fechaControl.setValue(d, { emitEvent: false });
    const formatted = this.funcionesDatosS.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaRetencionV2InputRef?.nativeElement) this.fechaRetencionV2InputRef.nativeElement.value = formatted;
    });
    this.obtenerFiscal();
  }

  capturarFechaEmiDocRaw(event: Event): void {
    this._rawFechaEmiDoc = (event.target as HTMLInputElement).value;
  }

  syncFechaEmiDocFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaEmiDoc || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaEmiDoc = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.fechaEmiDocControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaEmiDocV2InputRef?.nativeElement) this.fechaEmiDocV2InputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaEmiDocPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.fechaEmiDocControl.setValue(d, { emitEvent: false });
    const formatted = this.funcionesDatosS.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaEmiDocV2InputRef?.nativeElement) this.fechaEmiDocV2InputRef.nativeElement.value = formatted;
    });
  }

  responsive(width: number): void { this.vertical = width < 1024; }

  private calcularTotalRetenido(): void {
    this.totalRetenido = this.rd(this.listaDetalles.reduce((s, d) => s + Number(d.valorReten || 0), 0));
  }

  private limpiarDetalle(): void {
    // Solo limpia los campos de la línea de detalle, NO los del documento retenido
    this.idImpuesto = null; this.idPorcentaje = null;
    this.txtBaseImponible = 0; this.txtPorcentaje = 0; this.txtValorReten = 0;
    this.tablaPorcentajes = [];
  }

  private cargarSesion(): void {
    const u = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');
    if (u) { try { this.vUsuario = JSON.parse(u); } catch { /* ignore */ } }
    const f = sessionStorage.getItem('facturador') || localStorage.getItem('facturador');
    if (f) { try { this.vFacturador = JSON.parse(f) as Facturador; } catch { /* ignore */ } }
  }

  private cargarFacturadorYPtoEmision(): void {
    if (!this.vFacturador?.id) {
      this.facturadorService.getAll().subscribe({
        next: (fs) => { const f = (fs || [])[0]; if (f) { this.vFacturador = f; this.cargarPuntosEmision(); } },
      });
      return;
    }
    this.cargarPuntosEmision();
  }

  private cargarPuntosEmision(): void {
    this.puntoEmisionService.getAll().subscribe({
      next: (ps) => { const a = (ps || []).filter((p) => p.estado === 1); this.ptosEmision = a; this.ptoEmision = a[0] || null; },
    });
  }

  private cargarCatalogos(): void {
    this.detalleSriService.getAll().subscribe({
      next: (all) => {
        const d = (all || []).filter((x) => x.estado === 1);
        this.tablaTiposDoc = d.filter((x) => this.gTC(x.lsri) === TABLA_TIPO_DOC);
        this.tablaImpuestos = d.filter((x) => this.gTC(x.lsri) === TABLA_IMPUESTO);
        this.tablaPorcentajesIR = d.filter((x) => this.gTC(x.lsri) === TABLA_PORCENTAJE_IR);
        this.tablaPorcentajesIVA = d.filter((x) => this.gTC(x.lsri) === TABLA_PORCENTAJE_IVA_R);
        this.tablaPorcentajesISD = d.filter((x) => this.gTC(x.lsri) === TABLA_PORCENTAJE_ISD);
        this.tablaFormasPago = d.filter((x) => this.gTC(x.lsri) === TABLA_FORMA_PAGO);
        if (this.tablaTiposDoc.length) this.idDocumento = this.tablaTiposDoc[0];
        if (this.tablaImpuestos.length) { this.idImpuesto = this.tablaImpuestos[0]; this.onCambioImpuesto(); }
      },
    });
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

  private rd(v: number, d = 2): number {
    const f = 10 ** d;
    return Math.round((Number(v || 0) + Number.EPSILON) * f) / f;
  }

  private parseError(error: unknown, fallback: string): string {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      if (err['message'] && typeof err['message'] === 'string') return err['message'];
      if (err['error']) {
        if (typeof err['error'] === 'string') return err['error'];
        const inner = err['error'] as Record<string, unknown>;
        if (inner['message'] && typeof inner['message'] === 'string') return inner['message'];
        if (inner['mensaje'] && typeof inner['mensaje'] === 'string') return inner['mensaje'];
      }
      if (err['statusText'] && typeof err['statusText'] === 'string' && err['statusText'] !== 'Unknown Error')
        return err['statusText'] as string;
    }
    return fallback;
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3500, panelClass: ['snackbar-success'], horizontalPosition: 'center', verticalPosition: 'bottom' });
  }

  private mostrarAdvertencia(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 7000, panelClass: ['snackbar-warning'], horizontalPosition: 'center', verticalPosition: 'bottom' });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 4500, panelClass: ['snackbar-error'], horizontalPosition: 'center', verticalPosition: 'bottom' });
  }
}
