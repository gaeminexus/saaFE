import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, UntypedFormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NegociacionProveedor } from '../../../model/negociacion-proveedor';
import { FormaPagoNegociacion } from '../../../model/forma-pago-negociacion';
import { PagoNegociacion } from '../../../model/pago-negociacion';
import { AdendumNegociacion } from '../../../model/adendum-negociacion';
import { PathNegociacion } from '../../../model/path-negociacion';
import { NegociacionProveedorService } from '../../../service/negociacion-proveedor.service';
import { FormaPagoNegociacionService } from '../../../service/forma-pago-negociacion.service';
import { PagoNegociacionService } from '../../../service/pago-negociacion.service';
import { AdendumNegociacionService } from '../../../service/adendum-negociacion.service';
import { PathNegociacionService } from '../../../service/path-negociacion.service';
import { PagoDialogComponent, PagoDialogData } from '../dialogs/pago-dialog/pago-dialog.component';
import { AdendumDialogComponent, AdendumDialogData } from '../dialogs/adendum-dialog/adendum-dialog.component';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { FileService } from '../../../../../shared/services/file.service';

// Cuota enriquecida con sus pagos
export interface CuotaConPagos extends FormaPagoNegociacion {
  pagos: PagoNegociacion[];
  totalPagado: number;
  saldo: number;
  expandida: boolean;
}

@Component({
  selector: 'app-detalle-negociacion',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './detalle-negociacion.component.html',
  styleUrl: './detalle-negociacion.component.scss',
})
export class DetalleNegociacionComponent implements OnInit {
  @ViewChild('fechaCuotaInput', { read: ElementRef }) fechaCuotaInputRef!: ElementRef<HTMLInputElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private negService = inject(NegociacionProveedorService);
  private cuotaService = inject(FormaPagoNegociacionService);
  private pagoService = inject(PagoNegociacionService);
  private adendumService = inject(AdendumNegociacionService);
  private pathService = inject(PathNegociacionService);
  private funcionesDatos = inject(FuncionesDatosService);
  private fileService = inject(FileService);

  cargando = signal(false);
  negociacion = signal<NegociacionProveedor | null>(null);
  cuotas = signal<CuotaConPagos[]>([]);
  adendums = signal<AdendumNegociacion[]>([]);
  documentos = signal<PathNegociacion[]>([]);

  tabActiva = 0;  // índice del mat-tab-group (no signal para compatibilidad con [(selectedIndex)])

  // Formulario de documento inline
  mostrarFormDocumento = signal(false);
  subiendoDoc = signal(false);
  formDoc = { nombreDoc: '', tipoDoc: 'CONTRATO' as string, principal: false };
  archivoSeleccionado: File | null = null;

  // Formulario de cuota inline
  mostrarFormCuota = signal(false);
  editandoCuota = signal<CuotaConPagos | null>(null);
  formCuota = { numeroCuota: 1, descripcion: '', porcentaje: 0, valorCuota: 0, orden: 1 };
  fechaCuotaControl = new UntypedFormControl(null);
  private _rawFechaCuota = '';

  // Resumen financiero
  valorVigente = signal(0);
  totalPagado = signal(0);
  totalFacturado = signal(0);
  totalLiquidado = signal(0);
  anticipoSinFactura = signal(0);
  saldoPendiente = signal(0);

  private idNegociacion = 0;
  private get idUsuario(): number { try { const u = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}'); return u.codigo || u.id || 1; } catch { return 1; } }

  columnasAdendum = ['numAdendum', 'fechaAdendum', 'descripcion', 'valorAjuste', 'valorTotalResultante', 'estado', 'acciones'];
  columnasDocumentos = ['nombreDoc', 'tipoDoc', 'principal', 'path', 'acciones'];
  columnasCuota = ['numeroCuota', 'descripcion', 'fechaPago', 'porcentaje', 'valorCuota', 'totalPagado', 'saldo', 'estado', 'acciones'];

  ngOnInit(): void {
    this.idNegociacion = Number(this.route.snapshot.paramMap.get('id'));
    if (this.idNegociacion) this.cargarTodo();
  }

  volver(): void { this.router.navigate(['/menucuentaxpagar/negociaciones']); }

  cargarTodo(): void {
    this.cargando.set(true);
    forkJoin({
      neg: this.negService.getById(this.idNegociacion).pipe(catchError(() => of(null))),
      cuotas: this.cuotaService.selectByCriteria({ negociacion: { id: this.idNegociacion } }).pipe(catchError(() => of([]))),
      adendums: this.adendumService.selectByCriteria({ negociacion: { id: this.idNegociacion } }).pipe(catchError(() => of([]))),
      documentos: this.pathService.selectByCriteria({ negociacion: { id: this.idNegociacion } }).pipe(catchError(() => of([]))),
    }).subscribe(({ neg, cuotas, adendums, documentos }) => {
      this.negociacion.set(neg);
      this.adendums.set((adendums || []).filter(a => a.estado === 1));
      this.documentos.set(documentos || []);

      // Calcular valor vigente
      const valOrig = neg?.valorTotal || 0;
      const sumAdendum = (adendums || []).filter(a => a.estado === 1).reduce((s, a) => s + Number(a.valorAjuste || 0), 0);
      this.valorVigente.set(valOrig + sumAdendum);

      // Cargar pagos por cuota
      const cuotasList = cuotas || [];
      if (cuotasList.length === 0) {
        this.cuotas.set([]);
        this.calcularResumen([]);
        this.cargando.set(false);
        return;
      }

      forkJoin(
        cuotasList.map(c => this.pagoService.selectByCriteria({ formaPago: { id: c.id } }).pipe(catchError(() => of([]))))
      ).subscribe(pagosArr => {
        const cuotasConPagos: CuotaConPagos[] = cuotasList.map((c, i) => {
          const pagos = (pagosArr[i] || []).filter((p: PagoNegociacion) => p.estado === 1);
          const totalPagado = pagos.reduce((s: number, p: PagoNegociacion) => s + Number(p.valorPago || 0), 0);
          return { ...c, pagos, totalPagado, saldo: Number(c.valorCuota || 0) - totalPagado, expandida: false };
        });
        cuotasConPagos.sort((a, b) => (a.orden || a.numeroCuota) - (b.orden || b.numeroCuota));
        this.cuotas.set(cuotasConPagos);
        this.calcularResumen(cuotasConPagos);
        this.cargando.set(false);
      });
    });
  }

  private calcularResumen(cuotas: CuotaConPagos[]): void {
    const todosLosPagos = cuotas.flatMap(c => c.pagos);
    const totalPag = todosLosPagos.reduce((s, p) => s + Number(p.valorPago || 0), 0);
    const totalFact = todosLosPagos.filter(p => p.facturado === 1).reduce((s, p) => s + Number(p.valorPago || 0), 0);
    const totalLiq = todosLosPagos.filter(p => p.pagado === 1).reduce((s, p) => s + Number(p.valorPago || 0), 0);
    const anticipo = todosLosPagos.filter(p => p.tipoPago === 'ANTICIPO' && p.facturado === 0).reduce((s, p) => s + Number(p.valorPago || 0), 0);
    this.totalPagado.set(totalPag);
    this.totalFacturado.set(totalFact);
    this.totalLiquidado.set(totalLiq);
    this.anticipoSinFactura.set(anticipo);
    this.saldoPendiente.set(this.valorVigente() - totalPag);
  }

  // ─── CUOTAS ────────────────────────────────────────────────

  toggleCuota(c: CuotaConPagos): void { c.expandida = !c.expandida; }

  nuevaCuota(): void {
    const sigNum = (this.cuotas().length || 0) + 1;
    this.formCuota = { numeroCuota: sigNum, descripcion: '', porcentaje: 0, valorCuota: 0, orden: sigNum };
    this.fechaCuotaControl.setValue(null, { emitEvent: false });
    this.editandoCuota.set(null);
    this.mostrarFormCuota.set(true);
    this.forzarTextoFechaCuota(null);
  }

  editarCuota(c: CuotaConPagos): void {
    this.formCuota = { numeroCuota: c.numeroCuota, descripcion: c.descripcion || '', porcentaje: c.porcentaje || 0, valorCuota: c.valorCuota || 0, orden: c.orden || c.numeroCuota };
    const d = this.toDate(c.fechaPago);
    this.fechaCuotaControl.setValue(d, { emitEvent: false });
    this.editandoCuota.set(c);
    this.mostrarFormCuota.set(true);
    this.forzarTextoFechaCuota(d);
  }

  private forzarTextoFechaCuota(date: Date | null): void {
    const formatted = date ? this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaCuotaInputRef?.nativeElement) this.fechaCuotaInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaCuotaRaw(event: Event): void {
    this._rawFechaCuota = (event.target as HTMLInputElement).value;
  }

  syncFechaCuotaFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaCuota || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaCuota = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        this.fechaCuotaControl.setValue(date, { emitEvent: false });
        this.forzarTextoFechaCuota(date);
      }
    }
  }

  onFechaCuotaPickerChange(date: Date | null | undefined): void {
    const d = date || null;
    this.fechaCuotaControl.setValue(d, { emitEvent: false });
    this.forzarTextoFechaCuota(d);
  }

  calcularValorDesdePorcentaje(): void {
    const vv = this.valorVigente();
    if (vv > 0 && this.formCuota.porcentaje > 0) {
      this.formCuota.valorCuota = Math.round((this.formCuota.porcentaje / 100) * vv * 100) / 100;
    }
  }

  guardarCuota(): void {
    if (!this.formCuota.valorCuota || this.formCuota.valorCuota <= 0) { this.mostrarError('Ingrese un valor de cuota'); return; }
    const ed = this.editandoCuota();
    const payload: Partial<FormaPagoNegociacion> = {
      ...(ed ? { id: ed.id } : {}),
      negociacion: { id: this.idNegociacion } as any,
      numeroCuota: this.formCuota.numeroCuota,
      descripcion: this.formCuota.descripcion || undefined,
      fechaPago: this.dateToISO(this.fechaCuotaControl.value),
      porcentaje: this.formCuota.porcentaje || undefined,
      valorCuota: this.formCuota.valorCuota,
      orden: this.formCuota.orden,
      estado: ed?.estado ?? 1,
    };
    const op$ = ed ? this.cuotaService.update(payload) : this.cuotaService.add(payload);
    op$.subscribe({
      next: () => { this.mostrarExito(ed ? 'Cuota actualizada' : 'Cuota creada'); this.mostrarFormCuota.set(false); this.cargarTodo(); },
      error: () => this.mostrarError('Error al guardar cuota'),
    });
  }

  eliminarCuota(c: CuotaConPagos): void {
    if (c.pagos.length > 0) { this.mostrarError('No se puede eliminar una cuota con pagos registrados'); return; }
    if (!confirm('¿Eliminar esta cuota?')) return;
    this.cuotaService.delete(c.id).subscribe({ next: () => { this.mostrarExito('Cuota eliminada'); this.cargarTodo(); }, error: () => this.mostrarError('Error al eliminar') });
  }

  // ─── PAGOS ──────────────────────────────────────────────────

  abrirRegistrarPago(cuota: CuotaConPagos): void {
    const data: PagoDialogData = { cuota, idUsuario: this.idUsuario };
    this.dialog.open(PagoDialogComponent, { width: '700px', maxWidth: '98vw', data }).afterClosed().subscribe(guardado => {
      if (guardado) { this.mostrarExito('Pago registrado'); this.cargarTodo(); }
    });
  }

  eliminarPago(p: PagoNegociacion): void {
    if (!confirm('¿Anular este pago?')) return;
    this.pagoService.delete(p.id).subscribe({ next: () => { this.mostrarExito('Pago anulado'); this.cargarTodo(); }, error: () => this.mostrarError('Error') });
  }

  // ─── ADENDUMS ───────────────────────────────────────────────

  abrirAdendum(ad?: AdendumNegociacion): void {
    const data: AdendumDialogData = { negociacion: this.negociacion()!, valorVigente: this.valorVigente(), adendum: ad || null, idUsuario: this.idUsuario };
    this.dialog.open(AdendumDialogComponent, { width: '700px', maxWidth: '98vw', data }).afterClosed().subscribe(guardado => {
      if (guardado) { this.mostrarExito(ad ? 'Adendum actualizado' : 'Adendum registrado'); this.cargarTodo(); }
    });
  }

  eliminarAdendum(ad: AdendumNegociacion): void {
    if (!confirm('¿Anular este adendum?')) return;
    this.adendumService.update({ ...ad, estado: 0 }).subscribe({ next: () => { this.mostrarExito('Adendum anulado'); this.cargarTodo(); }, error: () => this.mostrarError('Error') });
  }

  // ─── DOCUMENTOS ─────────────────────────────────────────────

  abrirFormDocumento(): void {
    this.formDoc = { nombreDoc: '', tipoDoc: 'CONTRATO', principal: this.documentos().length === 0 };
    this.archivoSeleccionado = null;
    this.mostrarFormDocumento.set(true);
  }

  seleccionarArchivo(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const validacion = this.fileService.validateFile(file);
        if (!validacion.valid) { this.mostrarError(validacion.message); return; }
        this.archivoSeleccionado = file;
        if (!this.formDoc.nombreDoc) {
          this.formDoc.nombreDoc = file.name.replace(/\.[^/.]+$/, '');
        }
      }
    };
    input.click();
  }

  guardarDocumento(): void {
    if (!this.archivoSeleccionado) { this.mostrarError('Seleccione un archivo'); return; }
    if (!this.formDoc.nombreDoc.trim()) { this.mostrarError('Ingrese un nombre para el documento'); return; }

    this.subiendoDoc.set(true);
    const uploadPath = `negociaciones/${this.idNegociacion}`;

    this.fileService.uploadFileCustomPath(this.archivoSeleccionado, uploadPath).subscribe({
      next: (resp) => {
        if (!resp?.filePath) { this.subiendoDoc.set(false); this.mostrarError('El servidor no devolvió la ruta del archivo'); return; }
        const payload: Partial<PathNegociacion> = {
          negociacion: { id: this.idNegociacion } as any,
          path: resp.filePath,
          nombreDoc: this.formDoc.nombreDoc.trim(),
          tipoDoc: this.formDoc.tipoDoc,
          principal: this.formDoc.principal ? 1 : 0,
          adendum: null,
        };
        this.pathService.add(payload).subscribe({
          next: () => {
            this.subiendoDoc.set(false);
            this.mostrarFormDocumento.set(false);
            this.archivoSeleccionado = null;
            this.mostrarExito('Documento guardado correctamente');
            this.cargarTodo();
          },
          error: () => { this.subiendoDoc.set(false); this.mostrarError('Error al guardar el registro del documento'); },
        });
      },
      error: (err) => { this.subiendoDoc.set(false); this.mostrarError('Error al subir el archivo: ' + (err?.message || 'Error de conexión')); },
    });
  }

  eliminarDocumento(doc: PathNegociacion): void {
    if (!confirm(`¿Eliminar el documento "${doc.nombreDoc || doc.path}"?`)) return;
    this.pathService.delete(doc.id).subscribe({
      next: () => { this.mostrarExito('Documento eliminado'); this.cargarTodo(); },
      error: () => this.mostrarError('No se pudo eliminar el documento'),
    });
  }

  abrirDocumento(url: string): void { window.open(url, '_blank'); }

  // ─── HELPERS ────────────────────────────────────────────────

  toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (Array.isArray(value)) { const [y, mo, d, h = 0, m = 0, s = 0] = value as number[]; return new Date(y, mo - 1, d, h, m, s); }
    const d = new Date(value); return isNaN(d.getTime()) ? null : d;
  }

  private dateToISO(val: any): string | undefined {
    const d = this.toDate(val); if (!d) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  estadoCuotaLabel(e: number): string { return ({ 1: 'Pendiente', 2: 'Parcial', 3: 'Pagado', 0: 'Anulado' } as any)[e] ?? String(e); }
  estadoCuotaColor(e: number): string { return ({ 1: 'c-pendiente', 2: 'c-parcial', 3: 'c-pagado', 0: 'c-anulado' } as any)[e] ?? ''; }

  progresoCuota(c: CuotaConPagos): number {
    if (!c.valorCuota) return 0;
    return Math.min(100, Math.round((c.totalPagado / c.valorCuota) * 100));
  }

  vencidaHoy(c: CuotaConPagos): boolean {
    const d = this.toDate(c.fechaPago); if (!d) return false;
    return d < new Date() && c.estado !== 3;
  }

  private mostrarExito(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-success'] }); }
  private mostrarError(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] }); }
}
