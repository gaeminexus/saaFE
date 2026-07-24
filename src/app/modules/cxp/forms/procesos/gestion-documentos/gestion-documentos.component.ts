import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Titular } from '../../../../tsr/model/titular';
import { DocumentoCxp } from '../../../model/documento-cxp';
import { CargaDocumentosService, GrupoProducto, ProductoNuevo } from '../../../service/carga-documentos.service';
import { DocumentoCxpService } from '../../../service/documento-cxp.service';

// Estados que aún no están registrados en BD (pendientes de proceso)
const ESTADOS_PENDIENTES = [1, 2, 4, 5, 6];

@Component({
  selector: 'app-gestion-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './gestion-documentos.component.html',
  styleUrl: './gestion-documentos.component.scss',
})
export class GestionDocumentosComponent implements OnInit, AfterViewInit {
  private snackBar = inject(MatSnackBar);
  private docService = inject(DocumentoCxpService);
  private processService = inject(CargaDocumentosService);
  private dialog = inject(MatDialog);
  private funcionesDatos = inject(FuncionesDatosService);

  // ViewChild para datepickers de fecha
  @ViewChild('fechaDesdeInput', { read: ElementRef }) fechaDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaHastaInput', { read: ElementRef }) fechaHastaInputRef!: ElementRef<HTMLInputElement>;

  // FormControls para los datepickers
  fechaDesdeControl = new UntypedFormControl(null);
  fechaHastaControl = new UntypedFormControl(null);
  private _rawFechaDesde = '';
  private _rawFechaHasta = '';

  private readonly ROL_PROVEEDOR = 2;

  // Señales
  cargando = signal(false);
  procesando = signal(false);
  filtroEstado = signal<number | null>(null);

  // Datos
  rawDatos: DocumentoCxp[] = [];          // todos los estados (para totales)
  todosDocumentos: DocumentoCxp[] = [];   // solo no-3 (para tabla)
  dsDocumentos = new MatTableDataSource<DocumentoCxp>([]);
  columnas = ['id', 'tipoComprobante', 'rucEmisor', 'razonSocialEmisor', 'serieComprobante', 'fechaEmision', 'valorSinImpuestos', 'iva', 'importeTotal', 'estadoDocumento', 'novedad', 'acciones'];

  // Totales (calculados sobre el conjunto filtrado por texto/fecha, antes del filtro de estado)
  totalesRegistrados = signal({ subtotal: 0, iva: 0, total: 0, count: 0 });
  totalesPendientes  = signal({ subtotal: 0, iva: 0, total: 0, count: 0 });

  // Filtros de búsqueda
  filtroRuc = '';
  filtroProveedor = '';
  filtroTipo = '';

  // Inputs ocultos para XML
  private inputXmlEl: HTMLInputElement | null = null;
  docParaXml: DocumentoCxp | null = null;
  docParaResolverNovedad: DocumentoCxp | null = null;

  // Productos pendientes
  requiereProductos = signal(false);
  documentoCxpPendiente: DocumentoCxp | null = null;
  productosNuevos: ProductoNuevo[] = [];
  gruposProducto: GrupoProducto[] = [];

  private get idEmpresa(): number { return Number(localStorage.getItem('empresaCodigo') || localStorage.getItem('empresaId') || 1); }
  private get idUsuario(): number { try { const u = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}'); return u.codigo || u.id || 1; } catch { return 1; } }

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    // Inicialización después de que las vistas estén disponibles
  }

  // ─── CARGA Y FILTROS ────────────────────────────────────

  cargar(): void {
    this.cargando.set(true);
    // Siempre cargamos TODOS los estados para calcular totales correctamente;
    // el filtro de estado se aplica en cliente.
    this.docService.getByEmpresa(this.idEmpresa).subscribe({
      next: (data) => {
        this.rawDatos = data || [];
        this.todosDocumentos = this.rawDatos.filter(d => d.estadoDocumento !== 3);
        this.aplicarFiltrosBusqueda();
        this.cargando.set(false);
      },
      error: () => { this.mostrarError('No se pudo cargar los documentos'); this.cargando.set(false); },
    });
  }

  setFiltroEstado(estado: number | null): void {
    this.filtroEstado.set(estado);
    this.cargar();
  }

  buscar(): void {
    this.aplicarFiltrosBusqueda();
  }

  limpiarFiltros(): void {
    this.filtroRuc = '';
    this.filtroProveedor = '';
    this.filtroTipo = '';
    this.fechaDesdeControl.setValue(null, { emitEvent: false });
    this.fechaHastaControl.setValue(null, { emitEvent: false });
    if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = '';
    if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = '';
    this.aplicarFiltrosBusqueda();
  }

  private aplicarFiltrosBusqueda(): void {
    // 1. Aplicar filtros de texto y fecha sobre TODOS los datos (raw, todos los estados)
    let filtradosTodos = [...this.rawDatos];

    if (this.filtroRuc.trim()) {
      const ruc = this.filtroRuc.trim().toLowerCase();
      filtradosTodos = filtradosTodos.filter(d => d.rucEmisor?.toLowerCase().includes(ruc));
    }
    if (this.filtroProveedor.trim()) {
      const prov = this.filtroProveedor.trim().toLowerCase();
      filtradosTodos = filtradosTodos.filter(d => d.razonSocialEmisor?.toLowerCase().includes(prov));
    }
    if (this.filtroTipo.trim()) {
      const tipo = this.filtroTipo.trim().toLowerCase();
      filtradosTodos = filtradosTodos.filter(d => d.tipoComprobante?.toLowerCase().includes(tipo));
    }
    const fechaDesdeStr = this.dateToYMD(this.fechaDesdeControl.value);
    const fechaHastaStr = this.dateToYMD(this.fechaHastaControl.value);
    if (fechaDesdeStr) {
      filtradosTodos = filtradosTodos.filter(d => this.compareFecha(d.fechaEmision) >= fechaDesdeStr);
    }
    if (fechaHastaStr) {
      filtradosTodos = filtradosTodos.filter(d => this.compareFecha(d.fechaEmision) <= fechaHastaStr);
    }

    // 2. Calcular totales antes del filtro de estado (registrados vs pendientes)
    this.calcularTotales(filtradosTodos);

    // 3. Aplicar filtro de estado para la tabla (solo no-3 como base, luego estado si es específico)
    let paraTabla = filtradosTodos.filter(d => d.estadoDocumento !== 3);
    const estado = this.filtroEstado();
    if (estado !== null) {
      paraTabla = estado === 5
        ? paraTabla.filter(d => d.estadoDocumento === 5 && !!d.novedad)
        : paraTabla.filter(d => d.estadoDocumento === estado);
    }

    this.dsDocumentos.data = paraTabla;
  }

  private calcularTotales(docs: DocumentoCxp[]): void {
    const sum = (arr: DocumentoCxp[]) => arr.reduce(
      (acc, d) => ({
        subtotal: acc.subtotal + Number(d.valorSinImpuestos || 0),
        iva:      acc.iva      + Number(d.iva || 0),
        total:    acc.total    + Number(d.importeTotal || 0),
        count:    acc.count    + 1,
      }),
      { subtotal: 0, iva: 0, total: 0, count: 0 }
    );
    this.totalesRegistrados.set(sum(docs.filter(d => d.estadoDocumento === 3)));
    this.totalesPendientes .set(sum(docs.filter(d => d.estadoDocumento !== 3)));
  }

  // ─── BUSCAR TITULAR PROVEEDOR ───────────────────────────

  abrirBusquedaTitular(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    });
    dialogRef.afterClosed().subscribe((titular: Titular | null) => {
      if (titular) {
        this.filtroProveedor = titular.nombre || titular.razonSocial || '';
        this.aplicarFiltrosBusqueda();
      }
    });
  }

  // ─── DATEPICKER: FECHA DESDE ────────────────────────────

  capturarFechaDesdeRaw(event: Event): void {
    this._rawFechaDesde = (event.target as HTMLInputElement).value;
  }

  syncFechaDesdeFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaDesde || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaDesde = '';
    if (!raw) return;
    const date = this.parseFechaLocal(raw);
    if (date) {
      this.fechaDesdeControl.setValue(date, { emitEvent: false });
      const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
      setTimeout(() => { if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = formatted; });
    }
  }

  onFechaDesdePickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.fechaDesdeControl.setValue(d, { emitEvent: false });
    const formatted = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = formatted; });
  }

  // ─── DATEPICKER: FECHA HASTA ────────────────────────────

  capturarFechaHastaRaw(event: Event): void {
    this._rawFechaHasta = (event.target as HTMLInputElement).value;
  }

  syncFechaHastaFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaHasta || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaHasta = '';
    if (!raw) return;
    const date = this.parseFechaLocal(raw);
    if (date) {
      this.fechaHastaControl.setValue(date, { emitEvent: false });
      const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
      setTimeout(() => { if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = formatted; });
    }
  }

  onFechaHastaPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.fechaHastaControl.setValue(d, { emitEvent: false });
    const formatted = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = formatted; });
  }

  // ─── HELPERS FECHA ──────────────────────────────────────

  private parseFechaLocal(valor: any): Date | null {
    if (!valor) return null;
    if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
    const str = String(valor).trim();
    const parts = str.split('/');
    if (parts.length === 3) {
      const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
      if (!isNaN(dia) && !isNaN(mes) && !isNaN(anio) && anio >= 1000) {
        const d = new Date(anio, mes, dia);
        if (d.getFullYear() === anio && d.getMonth() === mes && d.getDate() === dia) return d;
      }
    }
    return null;
  }

  private dateToYMD(val: any): string {
    if (!val) return '';
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private compareFecha(val: any): string {
    if (!val) return '';
    if (Array.isArray(val)) {
      const [y, mo, d] = val as number[];
      return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
    return String(val).substring(0, 10);
  }

  // ─── SUBIR XML ──────────────────────────────────────────

  abrirSelectorXml(doc: DocumentoCxp): void {
    this.docParaXml = doc;
    this.docParaResolverNovedad = null;
    this.getInputXml().click();
  }

  onXmlFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (this.docParaResolverNovedad) {
      this.resolverNovedad(this.docParaResolverNovedad, 'REEMPLAZAR', file);
      this.docParaResolverNovedad = null;
    } else if (this.docParaXml) {
      this.subirXml(file, this.docParaXml);
      this.docParaXml = null;
    }
    (event.target as HTMLInputElement).value = '';
  }

  private subirXml(file: File, doc: DocumentoCxp): void {
    this.procesando.set(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const contenidoXml = (e.target?.result as string) || '';
      this.processService.cargarXml(doc.id, { contenidoXml, idUsuario: this.idUsuario }).subscribe({
        next: () => { this.procesando.set(false); this.mostrarExito('XML subido correctamente'); this.cargar(); },
        error: (err) => { this.procesando.set(false); this.mostrarError('Error al subir XML: ' + (err?.message || err)); },
      });
    };
    reader.readAsText(file, 'UTF-8');
  }

  // ─── REGISTRAR EN BD ────────────────────────────────────

  registrar(doc: DocumentoCxp): void {
    if (!confirm(`¿Registrar en BD el documento ${doc.serieComprobante}?`)) return;
    this.procesando.set(true);
    this.processService.registrarBD(doc.id, { idEmpresa: this.idEmpresa, idUsuario: this.idUsuario }).subscribe({
      next: (resp) => {
        this.procesando.set(false);
        if (resp?.requiereProductos) {
          this.documentoCxpPendiente = doc;
          this.productosNuevos = (resp.productosNuevos || []).map((p: ProductoNuevo) => ({ ...p, idGrupo: undefined }));
          this.requiereProductos.set(true);
          this.processService.getGruposProducto().subscribe({
            next: (grupos) => { this.gruposProducto = grupos || []; },
            error: () => { this.gruposProducto = []; },
          });
        } else if (resp?.error === 'TITULAR_NO_ENCONTRADO') {
          this.mostrarError(`Proveedor no encontrado — RUC: ${resp.rucEmisor}. Créelo en TSR primero.`);
        } else {
          this.mostrarExito(`Registrado: ${resp?.mensaje || 'OK'}`);
          this.cargar();
        }
      },
      error: (err) => { this.procesando.set(false); this.mostrarError('Error al registrar: ' + (err?.message || err)); },
    });
  }

  confirmarProductosYRegistrar(): void {
    if (!this.documentoCxpPendiente) return;
    if (this.productosNuevos.some(p => !p.idGrupo)) { this.mostrarError('Asigne un grupo a todos los productos.'); return; }
    this.procesando.set(true);
    this.processService.crearProductosYRegistrar(this.documentoCxpPendiente.id, {
      idEmpresa: this.idEmpresa, idUsuario: this.idUsuario, productosConGrupo: this.productosNuevos,
    }).subscribe({
      next: (resp) => {
        this.procesando.set(false); this.requiereProductos.set(false); this.documentoCxpPendiente = null;
        this.mostrarExito(`Registrado: ${resp?.mensaje || 'OK'}`); this.cargar();
      },
      error: (err) => { this.procesando.set(false); this.mostrarError('Error: ' + (err?.message || err)); },
    });
  }

  cancelarProductos(): void { this.requiereProductos.set(false); this.documentoCxpPendiente = null; this.productosNuevos = []; }

  // ─── RESOLVER NOVEDAD ───────────────────────────────────

  resolverNovedad(doc: DocumentoCxp, accion: 'MANTENER' | 'REEMPLAZAR', xmlFile?: File): void {
    if (accion === 'MANTENER') {
      if (!confirm(`¿Mantener el documento ${doc.serieComprobante} sin cambios?`)) return;
      this.procesando.set(true);
      this.processService.resolverNovedad(doc.id, { accion: 'MANTENER', idUsuario: this.idUsuario }).subscribe({
        next: () => { this.procesando.set(false); this.mostrarExito('Documento mantenido'); this.cargar(); },
        error: (err) => { this.procesando.set(false); this.mostrarError(err?.message || 'Error'); },
      });
    } else if (xmlFile) {
      this.procesando.set(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const contenidoXml = (e.target?.result as string) || '';
        this.processService.resolverNovedad(doc.id, { accion: 'REEMPLAZAR', contenidoXml, idUsuario: this.idUsuario }).subscribe({
          next: (resp) => { this.procesando.set(false); this.mostrarExito(resp?.mensaje || 'Reemplazado'); this.cargar(); },
          error: (err) => { this.procesando.set(false); this.mostrarError(err?.message || 'Error'); },
        });
      };
      reader.readAsText(xmlFile, 'UTF-8');
    }
  }

  abrirResolverReemplazar(doc: DocumentoCxp): void {
    this.docParaResolverNovedad = doc;
    this.docParaXml = null;
    this.getInputXml().click();
  }

  // ─── HELPERS ────────────────────────────────────────────

  estadoLabel(estado: number): string {
    const labels: Record<number, string> = { 1: 'LEÍDO', 2: 'XML CARGADO', 3: 'REGISTRADO', 4: 'ERROR', 5: 'NOVEDAD', 6: 'REVERTIDO' };
    return labels[estado] || String(estado);
  }

  estadoColor(estado: number): string {
    const colors: Record<number, string> = { 1: 'badge-leido', 2: 'badge-xml', 3: 'badge-registrado', 4: 'badge-error', 5: 'badge-novedad', 6: 'badge-revertido' };
    return colors[estado] || '';
  }

  toDate(value: any): Date | null {
    if (!value) return null;
    if (Array.isArray(value)) { const [y, mo, d, h = 0, m = 0, s = 0] = value as number[]; return new Date(y, mo - 1, d, h, m, s); }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private getInputXml(): HTMLInputElement {
    if (!this.inputXmlEl) {
      this.inputXmlEl = document.createElement('input');
      this.inputXmlEl.type = 'file';
      this.inputXmlEl.accept = '.xml,.XML';
      this.inputXmlEl.style.display = 'none';
      this.inputXmlEl.addEventListener('change', (e) => this.onXmlFileChange(e));
      document.body.appendChild(this.inputXmlEl);
    }
    this.inputXmlEl.value = '';
    return this.inputXmlEl;
  }

  /** Decodifica entidades HTML (ej: &#xf3; → ó) que vienen del SRI en tipoComprobante */
  decodeHtml(str: string | null | undefined): string {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  private mostrarExito(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-success'] }); }
  private mostrarError(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] }); }
}
