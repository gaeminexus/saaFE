import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { RetencionV2Emitir } from '../../../model/retencion-v2-emitir';
import { DetalleRetencionV2Emitir } from '../../../model/detalle-retencion-v2-emitir';
import { Titular } from '../../../../tsr/model/titular';
import { Facturador } from '../../../model/facturador';
import { PuntoEmision } from '../../../model/puntos-emision';
import { DetalleSri } from '../../../model/detalle-sri';
import { RetencionV2EmitirService } from '../../../service/emitir/retencion-v2-emitir.service';
import { FacturadorService } from '../../../service/facturador.service';
import { PuntoEmisionService } from '../../../service/punto-emision.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';

const TABLA_TIPO_DOC = '3';             // Tipos de documentos (LSRI 3)
const TABLA_IMPUESTO = '19';            // Impuestos retención (LSRI 19)
const TABLA_PORCENTAJE_IVA_R = '20';   // % Retención IVA (LSRI 20)
const TABLA_PORCENTAJE_IR = '615';     // % Retención Renta vigente desde mar-2024 (LSRI 615)
const TABLA_PORCENTAJE_ISD = '15';     // % Retención ISD
const TABLA_FORMA_PAGO = '610';        // Formas de pago SRI (LSRI 610)

@Component({
  selector: 'app-retencionesv2',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './retencionesv2.component.html',
  styleUrl: './retencionesv2.component.scss',
})
export class Retencionesv2Component implements OnInit {
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private service = inject(RetencionV2EmitirService);
  private facturadorService = inject(FacturadorService);
  private puntoEmisionService = inject(PuntoEmisionService);
  private detalleSriService = inject(DetalleSriService);
  private funcionesDatosS = inject(FuncionesDatosService);

  cargando = signal(false);
  guardando = signal(false);
  documentoActual = signal<RetencionV2Emitir | null>(null);
  deshabilitado = false;

  personaSeleccionada = signal<Titular | null>(null);
  textoTitularSeleccionado = computed(() => this.displayPersona(this.personaSeleccionada()));
  readonly rolProveedorCodigo = 2;
  readonly documentoNombre = 'Retención V2';

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
  strFechaEmiDoc: Date | string = '';
  txtBaseImponible = 0;
  txtPorcentaje = 0;
  txtValorReten = 0;

  docResTSinImpuestos = 0;
  docResIVACero = 0;
  docResPorIVA = 0;
  docResTotalIVA = 0;
  docResTotal = 0;

  strFecha: Date | string = '';
  periodoFiscal = '';
  observacion = '';
  totalRetenido = 0;

  listaDetalles: DetalleRetencionV2Emitir[] = [];
  dataSource = new MatTableDataSource<DetalleRetencionV2Emitir>([]);
  columnas = ['tipoDoc', 'numDoc', 'autorizacion', 'fechaEmision', 'impuesto', 'codReten', 'baseImponible', 'porcentaje', 'valor', 'acciones'];

  registros = signal<RetencionV2Emitir[]>([]);
  dataSourceRegistros = new MatTableDataSource<RetencionV2Emitir>([]);
  columnasRegistros = ['id', 'fecha', 'numero', 'periodoFiscal', 'titular', 'total', 'estado'];

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
    return this.documentoActual()?.id ? 'Retención V2 emitida' : 'Emitir Retención V2';
  }

  recargar(): void { this.cargarRegistros(); }

  cargarRegistros(): void {
    this.cargando.set(true);
    this.service.getAll().subscribe({
      next: (data) => { this.registros.set(data || []); this.dataSourceRegistros.data = data || []; this.cargando.set(false); },
      error: () => { this.mostrarError('No se pudieron cargar las retenciones'); this.cargando.set(false); },
    });
  }

  buscaProveedor(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px', maxWidth: '98vw',
      data: { rolCodigo: this.rolProveedorCodigo, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    });
    dialogRef.afterClosed().subscribe((t: Titular | null) => { if (t) this.personaSeleccionada.set(t); });
  }

  limpiarProveedor(): void { this.personaSeleccionada.set(null); }

  displayPersona(persona: Titular | null): string {
    if (!persona) return '';
    return `${persona.identificacion || ''} - ${persona.razonSocial || persona.nombre || ''}`.trim();
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
    const fecha = this.parseFechaLocal(this.strFecha);
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
      fechaEmiDoc: this.parseFechaLocal(this.strFechaEmiDoc),
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

    const payload: any = {
      facturador: this.vFacturador,
      titular: this.personaSeleccionada() as Titular,
      fecha: this.parseFechaLocal(this.strFecha),
      periodoFiscal: this.periodoFiscal,
      observacion: this.observacion,
      total: this.totalRetenido,
      ptoEmision: this.ptoEmision,
      usuario: this.vUsuario,
      autorizacion: '', clave: '', pathGen: '',
      estado: 1, estadoEmision: 1,
      detalleRetencion: this.listaDetalles.map((item) => ({ ...item })),
    };

    this.guardando.set(true);
    this.service.grabarRetencionV2(payload).subscribe({
      next: (resp) => {
        this.documentoActual.set(resp || null);
        this.deshabilitado = true;
        this.guardando.set(false);
        this.mostrarExito('Retención V2 generada correctamente');
        this.cargarRegistros();
      },
      error: (err) => { this.guardando.set(false); this.mostrarError(this.parseError(err, 'No se pudo grabar la retención')); },
    });
  }

  nueva(): void {
    this.documentoActual.set(null);
    this.deshabilitado = false;
    this.listaDetalles = [];
    this.dataSource.data = [];
    this.setFecha();
    this.observacion = '';
    this.totalRetenido = 0;
    this.limpiarDetalle();
    this.limpiarProveedor();
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  imprimirDocumento(): void {
    const contenido = document.getElementById('ticket-retencionv2')?.innerHTML;
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

  setFecha(): void {
    this.strFecha = new Date();
    this.obtenerFiscal();
    if (!this.strFechaEmiDoc) this.strFechaEmiDoc = this.strFecha;
  }

  responsive(width: number): void { this.vertical = width < 1024; }

  private calcularTotalRetenido(): void {
    this.totalRetenido = this.rd(this.listaDetalles.reduce((s, d) => s + Number(d.valorReten || 0), 0));
  }

  private limpiarDetalle(): void {
    this.idDocumento = null; this.idImpuesto = null; this.idPorcentaje = null; this.idFormaPago = null;
    this.numDocReten = ''; this.drAutorizacion = ''; this.strFechaEmiDoc = this.strFecha;
    this.txtBaseImponible = 0; this.txtPorcentaje = 0; this.txtValorReten = 0;
    this.docResTSinImpuestos = 0; this.docResIVACero = 0; this.docResPorIVA = 0;
    this.docResTotalIVA = 0; this.docResTotal = 0;
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
