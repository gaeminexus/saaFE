import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { Usuario } from '../../../../../shared/model/usuario';
import { NotaDebitoEmitir } from '../../../model/nota-debito-emitir';
import { DetalleNotaDebitoEmitir } from '../../../model/detalle-nota-debito-emitir';
import { Titular } from '../../../../tsr/model/titular';
import { Facturador } from '../../../model/facturador';
import { PuntoEmision } from '../../../model/puntos-emision';
import { DetalleSri } from '../../../model/detalle-sri';
import { NotaDebitoEmitirService } from '../../../service/emitir/nota-debito-emitir.service';
import { FacturadorService } from '../../../service/facturador.service';
import { PuntoEmisionService } from '../../../service/punto-emision.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';

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
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private service = inject(NotaDebitoEmitirService);
  private facturadorService = inject(FacturadorService);
  private puntoEmisionService = inject(PuntoEmisionService);
  private detalleSriService = inject(DetalleSriService);
  private funcionesDatosS = inject(FuncionesDatosService);

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
  lbIvaGral = '15';

  // Detalle en texto libre (no usa productos de inventario, como en FEG)
  detalleRazon = '';
  detalleValor = 0;
  txtDescuento = 0;
  txtPropina = 0;

  lbSubtotal = 0;
  lbIVACero = 0;
  lbTotalIVA = 0;
  lbTotal = 0;

  listaDetalles: DetalleNotaDebitoEmitir[] = [];
  dataSource = new MatTableDataSource<DetalleNotaDebitoEmitir>([]);
  columnas = ['descripcion', 'valor', 'baseImponible', 'iva', 'total', 'acciones'];

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

  limpiarCliente(): void { this.personaSeleccionada.set(null); }

  displayPersona(persona: Titular | null): string {
    if (!persona) return '';
    return `${persona.identificacion || ''} - ${persona.razonSocial || persona.nombre || ''}`.trim();
  }

  addDetalle(): void {
    if (!this.detalleRazon.trim()) { this.mostrarError('Ingrese la razón del detalle'); return; }
    if (this.detalleValor <= 0) { this.mostrarError('El valor debe ser mayor que 0'); return; }

    const baseImponible = this.rd(this.detalleValor);
    const valorIVA = this.rd(baseImponible * this.nmIvaGral / 100);
    const total = this.rd(baseImponible + valorIVA);

    const item = {
      id: null as unknown as number,
      notaDebito: {} as NotaDebitoEmitir,
      descripcion: this.detalleRazon.trim(),
      cantidad: 1,
      valor: baseImponible,
      subTotal: baseImponible,
      descuento: 0,
      baseImponible,
      porcentajeIVA: this.nmIvaGral,
      valorIVA,
      porcentajeICE: 0,
      valorICE: 0,
      subsidio: 0,
      total,
      estado: 1,
    } as DetalleNotaDebitoEmitir;

    this.listaDetalles.push(item);
    this.dataSource.data = [...this.listaDetalles];
    this.calcularTotales();
    this.detalleRazon = '';
    this.detalleValor = 0;
  }

  addDetalleIvaCero(): void {
    if (!this.detalleRazon.trim()) { this.mostrarError('Ingrese la razón del detalle'); return; }
    if (this.detalleValor <= 0) { this.mostrarError('El valor debe ser mayor que 0'); return; }

    const baseImponible = this.rd(this.detalleValor);
    const item = {
      id: null as unknown as number,
      notaDebito: {} as NotaDebitoEmitir,
      descripcion: this.detalleRazon.trim(),
      cantidad: 1,
      valor: baseImponible,
      subTotal: baseImponible,
      descuento: 0,
      baseImponible,
      porcentajeIVA: 0,
      valorIVA: 0,
      porcentajeICE: 0,
      valorICE: 0,
      subsidio: 0,
      total: baseImponible,
      estado: 1,
    } as DetalleNotaDebitoEmitir;

    this.listaDetalles.push(item);
    this.dataSource.data = [...this.listaDetalles];
    this.calcularTotales();
    this.detalleRazon = '';
    this.detalleValor = 0;
  }

  eliminaDetalle(item: DetalleNotaDebitoEmitir): void {
    this.listaDetalles = this.listaDetalles.filter((d) => d !== item);
    this.dataSource.data = [...this.listaDetalles];
    this.calcularTotales();
  }

  private calcularTotales(): void {
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
    if (!this.numDocModificado.trim()) { this.mostrarError('Ingrese el número del documento modificado'); return; }

    const comprador = this.personaSeleccionada() as Titular;
    const fechaDoc = this.parseFechaLocal(this.strFecha);
    const fechaDM = this.parseFechaLocal(this.strFechaEmisionDM);

    const payload: any = {
      id: null,
      tipoComprobante: NOTA_DEBITO,
      facturador: this.vFacturador,
      titular: comprador,
      tipoDoc: '04',
      numero: '',
      numEstablecimiento: this.ptoEmision.establecimiento?.codigo || '',
      numPtoEmision: this.ptoEmision.codigo || '',
      secuencial: '',
      ambiente: 1,
      clave: '',
      fecha: fechaDoc,
      tipoDocModificado: this.tipoDocModificado,
      numDocModificado: this.numDocModificado.trim(),
      fechaEmisionDM: fechaDM,
      observacion: this.observacion,
      subtotal: this.lbSubtotal,
      subcero: this.lbIVACero,
      pIVA: this.nmIvaGral,
      vIVA: this.lbTotalIVA,
      vICE: 0, vIRBPNR: 0,
      descuento: this.txtDescuento,
      porDescuento: 0,
      propina: this.txtPropina,
      subsidio: 0,
      total: this.lbTotal,
      ptoEmision: this.ptoEmision,
      usuario: this.vUsuario,
      pathGen: '', autorizacion: '', fechaAutorizacion: '',
      estado: 1, estadoEmision: 1,
      detalleNotaDebito: this.listaDetalles,
      formaPagoCodigo: this.formaPagoSri?.codigo || SIN_UTILIZACION_DEL_SISTEMA_FINANCIERO,
      plazo: this.plazoPago,
    };

    this.guardando.set(true);
    this.service.grabarNotaDebito(payload).subscribe({
      next: (resp) => {
        this.documentoActual.set(resp || null);
        this.registroId = resp?.id || null;
        this.deshabilitado = true;
        this.guardando.set(false);
        this.mostrarExito('Nota de débito generada correctamente');
        this.cargarRegistros();
      },
      error: (err) => { this.guardando.set(false); this.mostrarError(this.parseError(err, 'No se pudo grabar la nota de débito')); },
    });
  }

  nueva(): void {
    this.documentoActual.set(null); this.registroId = null; this.deshabilitado = false;
    this.listaDetalles = []; this.dataSource.data = [];
    this.setFecha();
    this.lbSubtotal = 0; this.lbIVACero = 0; this.lbTotalIVA = 0; this.lbTotal = 0;
    this.txtDescuento = 0; this.txtPropina = 0; this.observacion = '';
    this.numDocModificado = ''; this.tipoDocModificado = '01'; this.strFechaEmisionDM = '';
    this.detalleRazon = ''; this.detalleValor = 0;
    this.limpiarCliente();
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  imprimirDocumento(): void {
    const contenido = document.getElementById('ticket-nota-debito')?.innerHTML;
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
