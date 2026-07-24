import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { CargaArchivoTxt } from '../../../model/carga-archivo-txt';
import { DetalleCargaTxt } from '../../../model/detalle-carga-txt';
import { DocumentoCxp } from '../../../model/documento-cxp';
import { CargaArchivoTxtService } from '../../../service/carga-archivo-txt.service';
import { CargaDocumentosService, GrupoProducto, ProductoNuevo } from '../../../service/carga-documentos.service';
import { DetalleCargaTxtService } from '../../../service/detalle-carga-txt.service';
import { DocumentoCxpService } from '../../../service/documento-cxp.service';

@Component({
  selector: 'app-bandeja-electronica',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, DatePipe],
  templateUrl: './bandeja-electronica.component.html',
  styleUrl: './bandeja-electronica.component.scss',
})
export class BandejaElectronicaComponent implements OnInit {
  @ViewChild('inputTxt') inputTxt!: ElementRef<HTMLInputElement>;
  @ViewChild('inputXml') inputXml!: ElementRef<HTMLInputElement>;
  @ViewChild('inputXmlDoc') inputXmlDoc!: ElementRef<HTMLInputElement>;

  private snackBar = inject(MatSnackBar);
  private cargaService = inject(CargaArchivoTxtService);
  private detalleService = inject(DetalleCargaTxtService);
  private processService = inject(CargaDocumentosService);
  private docService = inject(DocumentoCxpService);

  // Vista actual: historial (cargas TXT) | documentos (DCXP) | detalle (líneas de una carga)
  vista: 'historial' | 'documentos' | 'detalle' = 'historial';

  // Señales de estado
  cargando = signal(false);
  procesando = signal(false);

  // Historial de cargas
  cargas: CargaArchivoTxt[] = [];
  dsCargas = new MatTableDataSource<CargaArchivoTxt>([]);
  columnasHistorial = ['id', 'nombreArchivo', 'fechaCarga', 'totalRegistros', 'registrosNuevos', 'registrosDuplicados', 'registrosNovedad', 'estado', 'acciones'];

  // Detalle de una carga seleccionada (líneas DCTX con documento DCXP embebido)
  cargaSeleccionada: CargaArchivoTxt | null = null;
  detalles: DetalleCargaTxt[] = [];
  dsDetalles = new MatTableDataSource<DetalleCargaTxt>([]);
  columnasDetalle = ['id', 'resultado', 'tipoComprobante', 'rucEmisor', 'razonSocialEmisor', 'serieComprobante', 'fechaEmision', 'valorSinImpuestosCarga', 'ivaCarga', 'importeTotalCarga', 'estadoDocumento', 'novedad', 'acciones'];

  // Detalle activo para subir XML
  detalleParaXml: DetalleCargaTxt | null = null;
  detalleParaResolverNovedad: DetalleCargaTxt | null = null;

  // Estado de productos pendientes
  requiereProductos = signal(false);
  documentoCxpPendiente: DocumentoCxp | null = null;
  productosNuevos: ProductoNuevo[] = [];
  gruposProducto: GrupoProducto[] = [];

  // ── Vista Documentos DCXP ──
  todosDocumentos: DocumentoCxp[] = [];
  dsDocumentos = new MatTableDataSource<DocumentoCxp>([]);
  columnasDocumentos = ['id', 'tipoComprobante', 'rucEmisor', 'razonSocialEmisor', 'serieComprobante', 'fechaEmision', 'valorSinImpuestos', 'iva', 'importeTotal', 'estadoDocumento', 'novedad', 'acciones'];
  filtroEstadoDoc = signal<number | null>(null);
  // Detalle activo en vista Documentos
  docParaXml: DocumentoCxp | null = null;
  docParaResolverNovedad: DocumentoCxp | null = null;

  // IDs de sesión (se deben obtener del localStorage/session)
  private get idEmpresa(): number { return Number(localStorage.getItem('empresaCodigo') || localStorage.getItem('empresaId') || 1); }
  private get idUsuario(): number { try { const u = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}'); return u.codigo || u.id || 1; } catch { return 1; } }

  ngOnInit(): void {
    this.cargarHistorial();
  }

  @HostListener('window:resize')
  onResize(): void {}

  // ─── HISTORIAL ──────────────────────────────────────────

  cargarHistorial(): void {
    this.cargando.set(true);
    this.cargaService.getByEmpresa(this.idEmpresa).subscribe({
      next: (data) => {
        this.cargas = (data || []);
        this.dsCargas.data = this.cargas;
        this.cargando.set(false);
      },
      error: () => { this.mostrarError('No se pudo cargar el historial'); this.cargando.set(false); },
    });
  }

  // ─── NUEVA CARGA TXT ────────────────────────────────────

  abrirSelectorTxt(): void {
    this.inputTxt.nativeElement.value = '';
    this.inputTxt.nativeElement.click();
  }

  onArchivoTxtSeleccionado(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.TXT')) {
      this.mostrarError('Solo se aceptan archivos .TXT del SRI'); return;
    }

    this.procesando.set(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const contenidoTxt = (e.target?.result as string) || '';
      this.processService.cargarTxt({
        contenidoTxt,
        nombreArchivo: file.name,
        idEmpresa: this.idEmpresa,
        idUsuario: this.idUsuario,
      }).subscribe({
        next: (resp) => {
          this.procesando.set(false);
          const msg = `Carga exitosa: ${resp?.nuevos ?? 0} nuevos, ${resp?.duplicados ?? 0} duplicados, ${resp?.novedades ?? 0} novedades`;
          this.mostrarExito(msg);
          this.cargarHistorial();
        },
        error: (err) => {
          this.procesando.set(false);
          this.mostrarError('Error al procesar el TXT: ' + (err?.message || err || 'Error desconocido'));
        },
      });
    };
    reader.readAsText(file, 'UTF-8');
  }

  // ─── VER DETALLE DE UNA CARGA ───────────────────────────

  verDetalle(carga: CargaArchivoTxt): void {
    this.cargaSeleccionada = carga;
    this.vista = 'detalle';
    this.cargando.set(true);
    this.requiereProductos.set(false);
    this.documentoCxpPendiente = null;
    // Consulta líneas DCTX filtradas por carga usando endpoint dedicado
    this.detalleService.getByCarga(carga.id).subscribe({
      next: (data) => {
        this.detalles = (data || []) as DetalleCargaTxt[];
        this.dsDetalles.data = this.detalles;
        this.cargando.set(false);
      },
      error: () => { this.mostrarError('No se pudo cargar el detalle'); this.cargando.set(false); },
    });
  }

  volverHistorial(): void {
    this.vista = 'historial';
    this.cargaSeleccionada = null;
    this.detalles = [];
    this.dsDetalles.data = [];
    this.requiereProductos.set(false);
  }

  // ─── FASE 2: SUBIR XML ──────────────────────────────────

  abrirSelectorXml(detalle: DetalleCargaTxt): void {
    this.detalleParaXml = detalle;
    this.detalleParaResolverNovedad = null;
    this.inputXml.nativeElement.value = '';
    this.inputXml.nativeElement.click();
  }

  private subirXml(file: File, detalle: DetalleCargaTxt): void {
    const idDocumentoCxp = detalle.documento.id;
    this.procesando.set(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const contenidoXml = (e.target?.result as string) || '';
      this.processService.cargarXml(idDocumentoCxp, { contenidoXml, idUsuario: this.idUsuario }).subscribe({
        next: () => {
          this.procesando.set(false);
          this.mostrarExito('XML subido correctamente');
          this.verDetalle(this.cargaSeleccionada!);
        },
        error: (err) => { this.procesando.set(false); this.mostrarError('Error al subir el XML: ' + (err?.message || err)); },
      });
    };
    reader.readAsText(file, 'UTF-8');
  }

  // ─── FASE 3: REGISTRAR EN BD ────────────────────────────

  registrarEnBD(detalle: DetalleCargaTxt): void {
    if (!confirm(`¿Registrar en BD el documento ${detalle.documento.serieComprobante}?`)) return;
    this.procesando.set(true);
    const idDocumentoCxp = detalle.documento.id;
    this.processService.registrarBD(idDocumentoCxp, { idEmpresa: this.idEmpresa, idUsuario: this.idUsuario }).subscribe({
      next: (resp) => {
        this.procesando.set(false);
        if (resp?.requiereProductos) {
          this.documentoCxpPendiente = detalle.documento;
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
          this.verDetalle(this.cargaSeleccionada!);
        }
      },
      error: (err) => { this.procesando.set(false); this.mostrarError('Error al registrar: ' + (err?.message || err)); },
    });
  }

  // ─── FASE 3b: CREAR PRODUCTOS Y REGISTRAR ─────────────────────

  confirmarProductosYRegistrar(): void {
    if (!this.documentoCxpPendiente) return;
    const sinGrupo = this.productosNuevos.filter(p => !p.idGrupo);
    if (sinGrupo.length > 0) { this.mostrarError('Debe asignar un grupo a todos los productos.'); return; }
    this.procesando.set(true);
    this.processService.crearProductosYRegistrar(this.documentoCxpPendiente.id, {
      idEmpresa: this.idEmpresa,
      idUsuario: this.idUsuario,
      productosConGrupo: this.productosNuevos,
    }).subscribe({
      next: (resp) => {
        this.procesando.set(false);
        this.requiereProductos.set(false);
        this.documentoCxpPendiente = null;
        this.mostrarExito(`Registrado: ${resp?.mensaje || 'OK'}`);
        if (this.vista === 'documentos') { this.cargarDocumentos(); } else { this.verDetalle(this.cargaSeleccionada!); }
      },
      error: (err) => { this.procesando.set(false); this.mostrarError('Error al registrar: ' + (err?.message || err)); },
    });
  }

  cancelarProductos(): void {
    this.requiereProductos.set(false);
    this.documentoCxpPendiente = null;
    this.productosNuevos = [];
  }

  // ─── VISTA DOCUMENTOS (DCXP) ─────────────────────────────

  irDocumentos(): void {
    this.vista = 'documentos';
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    this.cargando.set(true);
    const f = this.filtroEstadoDoc();
    const obs$ = f === null
      ? this.docService.getByEmpresa(this.idEmpresa)
      : f === 5
        ? this.docService.novedadesPendientes(this.idEmpresa)
        : this.docService.getByEmpresaEstado(this.idEmpresa, f);
    obs$.subscribe({
      next: (data) => {
        this.todosDocumentos = (data || []);
        this.dsDocumentos.data = this.todosDocumentos;
        this.cargando.set(false);
      },
      error: () => { this.mostrarError('No se pudo cargar los documentos'); this.cargando.set(false); },
    });
  }

  setFiltroEstado(estado: number | null): void {
    this.filtroEstadoDoc.set(estado);
    this.cargarDocumentos();
  }

  private aplicarFiltroEstado(): void {
    // Filtro ahora es server-side, este método ya no aplica
  }

  // Fase 2 desde vista Documentos
  abrirSelectorXmlDoc(doc: DocumentoCxp): void {
    this.docParaXml = doc;
    this.docParaResolverNovedad = null;
    this.inputXmlDoc.nativeElement.value = '';
    this.inputXmlDoc.nativeElement.click();
  }

  // Dispatcher XML para vista Documentos
  onXmlDocFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (this.docParaResolverNovedad) {
      this.resolverNovedadDoc(this.docParaResolverNovedad, 'REEMPLAZAR', file);
      this.docParaResolverNovedad = null;
    } else if (this.docParaXml) {
      this.subirXmlDoc(file, this.docParaXml);
      this.docParaXml = null;
    }
  }

  private subirXmlDoc(file: File, doc: DocumentoCxp): void {
    this.procesando.set(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const contenidoXml = (e.target?.result as string) || '';
      this.processService.cargarXml(doc.id, { contenidoXml, idUsuario: this.idUsuario }).subscribe({
        next: () => { this.procesando.set(false); this.mostrarExito('XML subido correctamente'); this.cargarDocumentos(); },
        error: (err) => { this.procesando.set(false); this.mostrarError('Error al subir el XML: ' + (err?.message || err)); },
      });
    };
    reader.readAsText(file, 'UTF-8');
  }

  // Fase 3 desde vista Documentos
  registrarDoc(doc: DocumentoCxp): void {
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
          this.cargarDocumentos();
        }
      },
      error: (err) => { this.procesando.set(false); this.mostrarError('Error al registrar: ' + (err?.message || err)); },
    });
  }

  // Fase 4 desde vista Documentos
  abrirResolverReemplazarDoc(doc: DocumentoCxp): void {
    this.docParaResolverNovedad = doc;
    this.docParaXml = null;
    this.inputXmlDoc.nativeElement.value = '';
    this.inputXmlDoc.nativeElement.click();
  }

  resolverNovedadDoc(doc: DocumentoCxp, accion: 'MANTENER' | 'REEMPLAZAR', xmlFile?: File): void {
    if (accion === 'MANTENER') {
      if (!confirm(`¿Mantener el documento ${doc.serieComprobante} sin cambios?`)) return;
      this.procesando.set(true);
      this.processService.resolverNovedad(doc.id, { accion: 'MANTENER', idUsuario: this.idUsuario }).subscribe({
        next: () => { this.procesando.set(false); this.mostrarExito('Documento mantenido sin cambios'); this.cargarDocumentos(); },
        error: (err) => { this.procesando.set(false); this.mostrarError(err?.message || 'Error al resolver'); },
      });
    } else if (xmlFile) {
      this.procesando.set(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const contenidoXml = (e.target?.result as string) || '';
        this.processService.resolverNovedad(doc.id, { accion: 'REEMPLAZAR', contenidoXml, idUsuario: this.idUsuario }).subscribe({
          next: (resp) => { this.procesando.set(false); this.mostrarExito(resp?.mensaje || 'Reemplazado correctamente'); this.cargarDocumentos(); },
          error: (err) => { this.procesando.set(false); this.mostrarError(err?.message || 'Error al reemplazar'); },
        });
      };
      reader.readAsText(xmlFile, 'UTF-8');
    }
  }

  // Fase 5 desde vista Documentos
  revertirDoc(doc: DocumentoCxp): void {
    if (!confirm(`¿Revertir el documento ${doc.serieComprobante}? Se eliminarán los registros creados en BD.`)) return;
    this.procesando.set(true);
    this.processService.revertir(doc.id, this.idUsuario).subscribe({
      next: () => { this.procesando.set(false); this.mostrarExito('Documento revertido'); this.cargarDocumentos(); },
      error: (err) => { this.procesando.set(false); this.mostrarError('Error al revertir: ' + (err?.message || err)); },
    });
  }

  // ─── FASE 4: RESOLVER NOVEDAD ───────────────────────────

  resolverNovedad(detalle: DetalleCargaTxt, accion: 'MANTENER' | 'REEMPLAZAR', xmlFile?: File): void {
    const idDocumentoCxp = detalle.documento.id;
    if (accion === 'MANTENER') {
      if (!confirm(`¿Mantener el documento ${detalle.documento.serieComprobante} sin cambios?`)) return;
      this.procesando.set(true);
      this.processService.resolverNovedad(idDocumentoCxp, { accion: 'MANTENER', idUsuario: this.idUsuario }).subscribe({
        next: () => { this.procesando.set(false); this.mostrarExito('Documento mantenido sin cambios'); this.verDetalle(this.cargaSeleccionada!); },
        error: (err) => { this.procesando.set(false); this.mostrarError(err?.message || 'Error al resolver'); },
      });
    } else if (xmlFile) {
      this.procesando.set(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const contenidoXml = (e.target?.result as string) || '';
        this.processService.resolverNovedad(idDocumentoCxp, { accion: 'REEMPLAZAR', contenidoXml, idUsuario: this.idUsuario }).subscribe({
          next: (resp) => { this.procesando.set(false); this.mostrarExito(resp?.mensaje || 'Reemplazado correctamente'); this.verDetalle(this.cargaSeleccionada!); },
          error: (err) => { this.procesando.set(false); this.mostrarError(err?.message || 'Error al reemplazar'); },
        });
      };
      reader.readAsText(xmlFile, 'UTF-8');
    }
  }

  abrirResolverReemplazar(detalle: DetalleCargaTxt): void {
    this.detalleParaResolverNovedad = detalle;
    this.detalleParaXml = null;
    this.inputXml.nativeElement.value = '';
    this.inputXml.nativeElement.click();
  }

  // Dispatcher del input de archivo XML (compartido para subir XML y resolver novedad)
  onXmlFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (this.detalleParaResolverNovedad) {
      this.resolverNovedad(this.detalleParaResolverNovedad, 'REEMPLAZAR', file);
      this.detalleParaResolverNovedad = null;
    } else if (this.detalleParaXml) {
      this.subirXml(file, this.detalleParaXml);
      this.detalleParaXml = null;
    }
  }

  // ─── FASE 5: REVERTIR ───────────────────────────────────

  revertir(detalle: DetalleCargaTxt): void {
    if (!confirm(`¿Revertir el documento ${detalle.documento.serieComprobante}? Se eliminarán los registros creados en BD.`)) return;
    this.procesando.set(true);
    this.processService.revertir(detalle.documento.id, this.idUsuario).subscribe({
      next: () => { this.procesando.set(false); this.mostrarExito('Documento revertido'); this.verDetalle(this.cargaSeleccionada!); },
      error: (err) => { this.procesando.set(false); this.mostrarError('Error al revertir: ' + (err?.message || err)); },
    });
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

  resultadoColor(resultado: string): string {
    const map: Record<string, string> = { 'NUEVO': 'badge-registrado', 'DUPLICADO': 'badge-xml', 'NOVEDAD': 'badge-novedad', 'IGNORADO': 'badge-leido' };
    return map[resultado] || '';
  }

  estadoCargaLabel(estado: number): string {
    return estado === 1 ? 'PROCESADO' : estado === 2 ? 'ERROR PARCIAL' : String(estado);
  }

  /**
   * Convierte cualquier formato de fecha del backend a Date:
   * - Array [año,mes,dia,h,m,s,ns] que Java serializa como LocalDateTime/LocalDate
   * - String ISO "2026-07-19T09:53:50"
   * - String fecha "2026-07-19"
   * - null/undefined → null
   */
  toDate(value: any): Date | null {
    if (!value) return null;
    if (Array.isArray(value)) {
      // [year, month(1-based), day, hour?, min?, sec?]
      const [y, mo, d, h = 0, m = 0, s = 0] = value as number[];
      return new Date(y, mo - 1, d, h, m, s);
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Decodifica entidades HTML (ej: &#xf3; → ó) que vienen del SRI en tipoComprobante */
  decodeHtml(str: string | null | undefined): string {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  private mostrarExito(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-success'] });
  }

  private mostrarError(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
  }
}
