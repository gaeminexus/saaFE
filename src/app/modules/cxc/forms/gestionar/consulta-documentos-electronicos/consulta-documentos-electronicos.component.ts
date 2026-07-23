import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { ExportService } from '../../../../../shared/services/export.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { FacturaEmitirService } from '../../../service/emitir/factura-emitir.service';
import { NotaCreditoEmitirService } from '../../../service/emitir/nota-credito-emitir.service';
import { NotaDebitoEmitirService } from '../../../service/emitir/nota-debito-emitir.service';
import { RetencionV2EmitirService } from '../../../service/emitir/retencion-v2-emitir.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';
import { MotivoAnulacionDialogComponent } from '../motivo-anulacion-dialog/motivo-anulacion-dialog.component';

export type TipoDocumento = 'TODOS' | 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'RETENCION';

export interface DocumentoElectronico {
  id: number;
  tipo: TipoDocumento;
  tipoLabel: string;
  numero: string;
  clienteIdentificacion: string;
  clienteNombre: string;
  fecha: Date | string | null;
  autorizacion: string;
  subtotal: number;
  subcero: number;
  vIVA: number;
  total: number;
  estadoEmision: number | string | null;
}

@Component({
  selector: 'app-consulta-documentos-electronicos',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './consulta-documentos-electronicos.component.html',
  styleUrl: './consulta-documentos-electronicos.component.scss',
})
export class ConsultaDocumentosElectronicosComponent implements OnInit {
  private facturaService    = inject(FacturaEmitirService);
  private ncService         = inject(NotaCreditoEmitirService);
  private ndService         = inject(NotaDebitoEmitirService);
  private retService        = inject(RetencionV2EmitirService);
  private detalleSriService = inject(DetalleSriService);
  private jasperReportes    = inject(JasperReportesService);
  private exportService     = inject(ExportService);
  private snackBar          = inject(MatSnackBar);
  private dialog            = inject(MatDialog);

  cargando    = signal(false);
  imprimiendo = signal(false);
  anulando    = signal(false);
  estados     = signal<Array<{ value: string; label: string }>>([]);

  private get usuarioSesion(): string {
    try {
      const u = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');
      if (u) return JSON.parse(u)?.username || JSON.parse(u)?.nombre || JSON.parse(u)?.login || 'sistema';
    } catch { /* */ }
    return 'sistema';
  }

  // Filtros
  tipoDocumento: TipoDocumento = 'TODOS';
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  numeroAutorizacion = '';
  cliente = '';

  tiposDocumento: Array<{ value: TipoDocumento; label: string }> = [
    { value: 'TODOS',        label: 'Todos' },
    { value: 'FACTURA',      label: 'Factura' },
    { value: 'NOTA_CREDITO', label: 'Nota de Crédito' },
    { value: 'NOTA_DEBITO',  label: 'Nota de Débito' },
    { value: 'RETENCION',    label: 'Retención' },
  ];

  columnas = [
    'tipo',
    'numero',
    'clienteIdentificacion',
    'clienteNombre',
    'fecha',
    'autorizacion',
    'subtotal',
    'subcero',
    'vIVA',
    'total',
    'estadoEmision',
    'acciones',
  ];

  dataSource = new MatTableDataSource<DocumentoElectronico>([]);
  registros: DocumentoElectronico[] = [];

  ngOnInit(): void {
    this.cargarEstados();
    this.buscar();
  }

  private cargarEstados(): void {
    const LSRI_ESTADOS = '603';
    this.detalleSriService.getAll().subscribe({
      next: (detalles) => {
        const estadosFiltered = (detalles || [])
          .filter((d) => d.estado === 1 && this.getTablaCodigo(d.lsri) === LSRI_ESTADOS)
          .map((d) => ({ value: d.codigo, label: d.detalle }))
          .sort((a, b) => Number(a.value) - Number(b.value));
        this.estados.set(estadosFiltered);
      },
      error: () => this.estados.set([]),
    });
  }

  private getTablaCodigo(lsri: number | { tabla?: string }): string {
    if (typeof lsri === 'object' && lsri?.tabla) return String(lsri.tabla);
    if (typeof lsri === 'number') return String(lsri);
    return '';
  }

  buscar(): void {
    this.cargando.set(true);

    const cargarFacturas   = (this.tipoDocumento === 'TODOS' || this.tipoDocumento === 'FACTURA')
      ? this.facturaService.getAll().pipe(catchError(() => of(null))) : of(null);
    const cargarNC         = (this.tipoDocumento === 'TODOS' || this.tipoDocumento === 'NOTA_CREDITO')
      ? this.ncService.getAll().pipe(catchError(() => of(null)))      : of(null);
    const cargarND         = (this.tipoDocumento === 'TODOS' || this.tipoDocumento === 'NOTA_DEBITO')
      ? this.ndService.getAll().pipe(catchError(() => of(null)))      : of(null);
    const cargarRet        = (this.tipoDocumento === 'TODOS' || this.tipoDocumento === 'RETENCION')
      ? this.retService.getAll().pipe(catchError(() => of(null)))     : of(null);

    forkJoin([cargarFacturas, cargarNC, cargarND, cargarRet]).subscribe({
      next: ([facturas, notasC, notasD, retenciones]) => {
        const docs: DocumentoElectronico[] = [];

        (facturas || []).forEach((f: any) => docs.push(this.normalizarFactura(f)));
        (notasC   || []).forEach((n: any) => docs.push(this.normalizarNotaCredito(n)));
        (notasD   || []).forEach((n: any) => docs.push(this.normalizarNotaDebito(n)));
        (retenciones || []).forEach((r: any) => docs.push(this.normalizarRetencion(r)));

        const filtrados = this.aplicarFiltros(docs)
          .sort((a, b) => {
            const fa = this.asDate(a.fecha)?.getTime() || 0;
            const fb = this.asDate(b.fecha)?.getTime() || 0;
            return fb - fa || (b.id || 0) - (a.id || 0);
          });

        this.registros = filtrados;
        this.dataSource.data = filtrados;
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.mostrarError('Error al cargar los documentos electrónicos');
      },
    });
  }

  limpiarFiltros(): void {
    this.tipoDocumento     = 'TODOS';
    this.fechaDesde        = null;
    this.fechaHasta        = null;
    this.numeroAutorizacion = '';
    this.cliente           = '';
    this.buscar();
  }

  imprimir(row: DocumentoElectronico): void {
    let reporte: string;
    let parametros: Record<string, unknown>;

    switch (row.tipo) {
      case 'FACTURA':      reporte = 'RPRT_RIDE_FACTURA';       parametros = { P_ID_FACTURA: row.id };       break;
      case 'NOTA_CREDITO': reporte = 'RPRT_RIDE_NOTA_CREDITO';  parametros = { P_ID_NOTA_CREDITO: row.id };  break;
      case 'NOTA_DEBITO':  reporte = 'RPRT_RIDE_NOTA_DEBITO';   parametros = { P_ID_NOTA_DEBITO: row.id };   break;
      case 'RETENCION':    reporte = 'RPRT_RIDE_RETENCION';     parametros = { P_ID_RETENCION: row.id };     break;
      default: this.mostrarError('Tipo de documento sin reporte configurado'); return;
    }

    this.imprimiendo.set(true);
    this.jasperReportes.generar('cxc', reporte, parametros, 'PDF').subscribe({
      next: (blob) => {
        this.imprimiendo.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      error: () => { this.imprimiendo.set(false); this.mostrarError('No se pudo generar el reporte'); },
    });
  }

  // ─── Acciones por fila ──────────────────────────────────────────────────

  autorizar(row: DocumentoElectronico): void {
    if (!this.puedeAutorizar(row)) {
      this.mostrarInfo('Solo se puede autorizar documentos en estado pendiente');
      return;
    }
    const req$ = (() => {
      switch (row.tipo) {
        case 'FACTURA':      return this.facturaService.reintentarAutorizacion({ idFactura: row.id });
        case 'NOTA_CREDITO': return this.ncService.reintentarAutorizacion({ idNotaCredito: row.id });
        case 'NOTA_DEBITO':  return this.ndService.reintentarAutorizacion({ idNotaDebito: row.id });
        case 'RETENCION':    return this.retService.reintentarAutorizacion({ idRetencion: row.id });
        default: return of(null);
      }
    })();
    req$.subscribe({
      next: () => { this.mostrarExito('Reintento de autorización enviado'); this.buscar(); },
      error: () => this.mostrarError('No se pudo reintentar la autorización'),
    });
  }

  reenviarMail(row: DocumentoElectronico): void {
    if (!this.puedeEmitida(row)) {
      this.mostrarInfo('Solo se puede reenviar mail para documentos en estado emitida');
      return;
    }
    const correoDefecto = this.obtenerCorreoRow(row);
    const ingresado = window.prompt('Ingrese correos separados por ;', correoDefecto);
    if (ingresado === null) return;
    const destinatarios = ingresado.split(';').map(c => c.trim()).filter(c => c.length > 0);
    if (!destinatarios.length) { this.mostrarInfo('Debe ingresar al menos un correo'); return; }
    const invalido = destinatarios.find(c => !this.esCorreoValido(c));
    if (invalido) { this.mostrarError(`Correo inválido: ${invalido}`); return; }
    const dest = destinatarios.join(';');
    const req$ = (() => {
      switch (row.tipo) {
        case 'FACTURA':      return this.facturaService.reenviarEmail({ idFactura: row.id, destinatarios: dest });
        case 'NOTA_CREDITO': return this.ncService.reenviarEmail({ idNotaCredito: row.id, destinatarios: dest });
        case 'NOTA_DEBITO':  return this.ndService.reenviarEmail({ idNotaDebito: row.id, destinatarios: dest });
        case 'RETENCION':    return this.retService.reenviarEmail({ idRetencion: row.id, destinatarios: dest });
        default: return of(null);
      }
    })();
    req$.subscribe({
      next: () => this.mostrarExito('Reenvío de correo solicitado'),
      error: () => this.mostrarError('No se pudo reenviar el correo'),
    });
  }

  anular(row: DocumentoElectronico): void {
    if (Number(row.estadoEmision) === 3) {
      this.mostrarInfo('El documento ya está anulado'); return;
    }
    const tipoLabel = row.tipoLabel || 'Documento';
    const dialogRef = this.dialog.open(MotivoAnulacionDialogComponent, {
      width: '480px', disableClose: true,
      data: { numero: row.numero || String(row.id), tipoLabel },
    });
    dialogRef.afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) return;
      this.anulando.set(true);
      const usuario = this.usuarioSesion;
      const req$ = (() => {
        switch (row.tipo) {
          case 'FACTURA':      return this.facturaService.anularFactura({ idFactura: row.id, usuario, motivo });
          case 'NOTA_CREDITO': return this.ncService.anular({ idNotaCredito: row.id, usuario, motivo });
          case 'NOTA_DEBITO':  return this.ndService.anular({ idNotaDebito: row.id, usuario, motivo });
          case 'RETENCION':    return this.retService.anular({ idRetencion: row.id, usuario, motivo });
          default: return of(null);
        }
      })();
      req$.subscribe({
        next: () => { this.anulando.set(false); this.mostrarExito(`${tipoLabel} anulada correctamente`); this.buscar(); },
        error: () => { this.anulando.set(false); this.mostrarError(`No se pudo anular el documento`); },
      });
    });
  }

  copiarClave(row: DocumentoElectronico): void {
    if (!this.puedeEmitida(row)) {
      this.mostrarInfo('Solo se puede copiar clave para documentos en estado emitida'); return;
    }
    const valor = row.autorizacion;
    if (!valor) { this.mostrarInfo('No existe autorización/clave disponible'); return; }
    navigator.clipboard.writeText(valor).then(() => this.mostrarExito('Clave copiada al portapapeles'));
  }

  puedeAutorizar(row: DocumentoElectronico): boolean {
    const codigo = String(Number(row.estadoEmision));
    const estadoMapeado = this.estados().find((e) => e.value === codigo);
    if (!estadoMapeado?.label) return false;
    return /^pendiente\b/i.test(estadoMapeado.label.trim());
  }

  puedeEmitida(row: DocumentoElectronico): boolean {
    const codigo = String(Number(row.estadoEmision));
    const estadoMapeado = this.estados().find((e) => e.value === codigo);
    if (!estadoMapeado?.label) return false;
    return /^emitida\b/i.test(estadoMapeado.label.trim());
  }

  puedeAnular(row: DocumentoElectronico): boolean {
    const codigo = String(Number(row.estadoEmision));
    const estadoMapeado = this.estados().find((e) => e.value === codigo);
    if (!estadoMapeado?.label) return true;
    return !/^anulada\b/i.test(estadoMapeado.label.trim());
  }

  private obtenerCorreoRow(row: DocumentoElectronico): string {
    // La info del titular no está en DocumentoElectronico normalizado; devuelve vacío como fallback
    return '';
  }

  private esCorreoValido(correo: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  exportarCSV(): void {
    if (!this.registros.length) { this.mostrarInfo('No hay datos para exportar'); return; }

    const headers = ['Tipo', 'Número', 'CI/RUC', 'Nombre', 'Fecha', 'Autorización', 'Subtotal', 'Sub.Cero', 'IVA', 'Total', 'Estado'];
    const keys:    (keyof DocumentoElectronico)[] = ['tipoLabel', 'numero', 'clienteIdentificacion', 'clienteNombre', 'fecha', 'autorizacion', 'subtotal', 'subcero', 'vIVA', 'total', 'estadoEmision'];

    const fecha = new Date().toISOString().slice(0, 10);
    this.exportService.exportToCSV(this.registros, `documentos_electronicos_${fecha}`, headers, keys);
  }

  puedeImprimir(row: DocumentoElectronico): boolean {
    return Number(row.estadoEmision) === 2;   // Emitida
  }

  estadoLabel(estadoEmision: number | string | null): string {
    const codigo = String(Number(estadoEmision));
    const encontrado = this.estados().find((e) => e.value === codigo);
    return encontrado?.label || `Estado ${codigo || 'desconocido'}`;
  }

  // ─── Normalización ────────────────────────────────────────────────────────

  private normalizarFactura(f: any): DocumentoElectronico {
    return {
      id:                    f.id,
      tipo:                  'FACTURA',
      tipoLabel:             'Factura',
      numero:                f.numero || '',
      clienteIdentificacion: f.titular?.identificacion || '',
      clienteNombre:         f.titular?.razonSocial || f.titular?.nombre || '',
      fecha:                 f.fecha,
      autorizacion:          f.autorizacion || f.clave || '',
      subtotal:              this.toNum(f.subtotal),
      subcero:               this.toNum(f.subcero),
      vIVA:                  this.toNum(f.vIVA),
      total:                 this.toNum(f.total),
      estadoEmision:         f.estadoEmision,
    };
  }

  private normalizarNotaCredito(n: any): DocumentoElectronico {
    return {
      id:                    n.id,
      tipo:                  'NOTA_CREDITO',
      tipoLabel:             'Nota de Crédito',
      numero:                n.numero || '',
      clienteIdentificacion: n.titular?.identificacion || '',
      clienteNombre:         n.titular?.razonSocial || n.titular?.nombre || '',
      fecha:                 n.fecha,
      autorizacion:          n.autorizacion || n.clave || '',
      subtotal:              this.toNum(n.subtotal),
      subcero:               this.toNum(n.subcero),
      vIVA:                  this.toNum(n.vIVA),
      total:                 this.toNum(n.total),
      estadoEmision:         n.estadoEmision,
    };
  }

  private normalizarNotaDebito(n: any): DocumentoElectronico {
    return {
      id:                    n.id,
      tipo:                  'NOTA_DEBITO',
      tipoLabel:             'Nota de Débito',
      numero:                n.numero || '',
      clienteIdentificacion: n.titular?.identificacion || '',
      clienteNombre:         n.titular?.razonSocial || n.titular?.nombre || '',
      fecha:                 n.fecha,
      autorizacion:          n.autorizacion || n.clave || '',
      subtotal:              this.toNum(n.subtotal),
      subcero:               this.toNum(n.subcero),
      vIVA:                  this.toNum(n.vIVA),
      total:                 this.toNum(n.total),
      estadoEmision:         n.estadoEmision,
    };
  }

  private normalizarRetencion(r: any): DocumentoElectronico {
    return {
      id:                    r.id,
      tipo:                  'RETENCION',
      tipoLabel:             'Retención',
      numero:                r.numero || '',
      clienteIdentificacion: r.titular?.identificacion || r.proveedor?.identificacion || '',
      clienteNombre:         r.titular?.razonSocial || r.titular?.nombre || r.proveedor?.razonSocial || r.proveedor?.nombre || '',
      fecha:                 r.fecha,
      autorizacion:          r.autorizacion || r.clave || '',
      subtotal:              0,
      subcero:               0,
      vIVA:                  0,
      total:                 this.toNum(r.total || r.totalRetenido),
      estadoEmision:         r.estadoEmision,
    };
  }

  // ─── Filtros ─────────────────────────────────────────────────────────────

  private aplicarFiltros(data: DocumentoElectronico[]): DocumentoElectronico[] {
    return data.filter((row) => {
      if (this.numeroAutorizacion.trim()) {
        if (!row.autorizacion.toLowerCase().includes(this.numeroAutorizacion.trim().toLowerCase())) return false;
      }
      if (this.cliente.trim()) {
        const filtro = this.cliente.trim().toLowerCase();
        if (!row.clienteNombre.toLowerCase().includes(filtro) && !row.clienteIdentificacion.toLowerCase().includes(filtro)) return false;
      }
      const fecha = this.asDate(row.fecha);
      if (this.fechaDesde && fecha && this.soloFecha(fecha) < this.soloFecha(this.fechaDesde)) return false;
      if (this.fechaHasta && fecha && this.soloFecha(fecha) > this.soloFecha(this.fechaHasta)) return false;
      return true;
    });
  }

  // ─── Utilidades ──────────────────────────────────────────────────────────

  /** Convierte el formato LocalDateTime del backend ("2026,7,22,18,38,...") a Date. */
  parseFechaArray(value: Date | string | null | undefined): Date | null {
    return this.asDate(value);
  }

  private asDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const str = String(value).trim();
    if (str.includes(',')) {
      const parts = str.split(',').map(Number);
      const [year, month, day, hour = 0, min = 0, sec = 0] = parts;
      if (year && month && day) return new Date(year, month - 1, day, hour, min, sec);
    }
    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private soloFecha(d: Date): number {
    const v = new Date(d); v.setHours(0, 0, 0, 0); return v.getTime();
  }

  private toNum(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private mostrarExito(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] }); }
  private mostrarInfo(msg: string): void  { this.snackBar.open(msg, 'Cerrar', { duration: 3000 }); }
  private mostrarError(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 4500, panelClass: ['snackbar-error'] }); }
}
