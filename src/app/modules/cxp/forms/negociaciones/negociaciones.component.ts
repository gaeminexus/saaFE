import { CommonModule } from '@angular/common';
import {
  AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject, signal
} from '@angular/core';
import { FormsModule, UntypedFormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { TitularSelectorDialogComponent } from '../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { Titular } from '../../../tsr/model/titular';
import { NegociacionProveedor } from '../../model/negociacion-proveedor';
import { NegociacionProveedorService } from '../../service/negociacion-proveedor.service';

type Vista = 'lista' | 'form';

@Component({
  selector: 'app-negociaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './negociaciones.component.html',
  styleUrl: './negociaciones.component.scss',
})
export class NegociacionesComponent implements OnInit, AfterViewInit {
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private negService = inject(NegociacionProveedorService);
  private funcionesDatos = inject(FuncionesDatosService);

  // ─── VISTA ─────────────────────────────────────────────────
  vista = signal<Vista>('lista');
  modoEdicion = signal(false);

  // ─── LISTA ─────────────────────────────────────────────────
  cargando = signal(false);
  todos: NegociacionProveedor[] = [];
  ds = new MatTableDataSource<NegociacionProveedor>([]);
  columnas = ['id', 'proveedor', 'numContrato', 'fechaNegociacion', 'valorTotal', 'tipoFinanciacion', 'estado', 'acciones'];

  filtroProveedor = '';
  filtroEstado = '';

  // ─── FORMULARIO ────────────────────────────────────────────
  form = {
    id: 0,
    titular: null as Titular | null,
    numContrato: '',
    descripcion: '',
    valorTotal: 0,
    tipoFinanciacion: 'PORCENTAJE' as string,
    numeroPagos: 1,
    observacion: '',
    estado: 1,
  };

  // Datepicker: Fecha Negociación
  @ViewChild('fechaNegInput', { read: ElementRef }) fechaNegInputRef!: ElementRef<HTMLInputElement>;
  fechaNegControl = new UntypedFormControl(new Date());
  private _rawFechaNeg = '';

  // Datepicker: Fecha Inicio
  @ViewChild('fechaIniInput', { read: ElementRef }) fechaIniInputRef!: ElementRef<HTMLInputElement>;
  fechaIniControl = new UntypedFormControl(null);
  private _rawFechaIni = '';

  // Datepicker: Fecha Fin
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;
  fechaFinControl = new UntypedFormControl(null);
  private _rawFechaFin = '';

  readonly TIPOS_FINANCIACION = [
    { valor: 'FIJO', label: 'Fijo (pagos periódicos iguales)' },
    { valor: 'HITO', label: 'Hito (por entregables)' },
    { valor: 'PORCENTAJE', label: 'Porcentaje del total' },
    { valor: 'UNICO', label: 'Único pago' },
  ];

  private readonly ROL_PROVEEDOR = 2;
  private get idEmpresa(): number { return Number(localStorage.getItem('empresaCodigo') || localStorage.getItem('empresaId') || 1); }
  private get empresa(): any {
    try { return JSON.parse(sessionStorage.getItem('empresa') || localStorage.getItem('empresa') || '{}'); }
    catch { return { pjrqcdgo: this.idEmpresa }; }
  }
  private get idUsuario(): number { try { const u = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}'); return u.codigo || u.id || 1; } catch { return 1; } }

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void {}

  // ─── CARGA ─────────────────────────────────────────────────

  cargar(): void {
    this.cargando.set(true);
    this.negService.getByEmpresa(this.idEmpresa).subscribe({
      next: (data) => {
        this.todos = data || [];
        this.aplicarFiltros();
        this.cargando.set(false);
      },
      error: () => { this.mostrarError('No se pudo cargar las negociaciones'); this.cargando.set(false); },
    });
  }

  aplicarFiltros(): void {
    let result = [...this.todos];
    if (this.filtroProveedor.trim()) {
      const f = this.filtroProveedor.trim().toLowerCase();
      result = result.filter(n => (n.titular?.nombre || n.titular?.razonSocial || '').toLowerCase().includes(f));
    }
    if (this.filtroEstado !== '') {
      result = result.filter(n => String(n.estado) === this.filtroEstado);
    }
    this.ds.data = result;
  }

  limpiarFiltros(): void { this.filtroProveedor = ''; this.filtroEstado = ''; this.aplicarFiltros(); }

  // ─── NAVEGACIÓN ─────────────────────────────────────────────

  nueva(): void {
    this.limpiarForm();
    this.modoEdicion.set(false);
    this.vista.set('form');
  }

  editar(neg: NegociacionProveedor): void {
    this.form = {
      id: neg.id,
      titular: neg.titular as Titular || null,
      numContrato: neg.numContrato || '',
      descripcion: neg.descripcion || '',
      valorTotal: neg.valorTotal || 0,
      tipoFinanciacion: neg.tipoFinanciacion || 'PORCENTAJE',
      numeroPagos: neg.numeroPagos || 1,
      observacion: neg.observacion || '',
      estado: neg.estado ?? 1,
    };
    this.setDateControl(this.fechaNegControl, this.fechaNegInputRef, neg.fechaNegociacion, true);
    this.setDateControl(this.fechaIniControl, this.fechaIniInputRef, neg.fechaInicio, false);
    this.setDateControl(this.fechaFinControl, this.fechaFinInputRef, neg.fechaFin, false);
    this.modoEdicion.set(true);
    this.vista.set('form');
  }

  verDetalle(neg: NegociacionProveedor): void {
    this.router.navigate(['/menucuentaxpagar/negociaciones/detalle', neg.id]);
  }

  cancelarForm(): void { this.vista.set('lista'); }

  // ─── BUSCAR TITULAR ─────────────────────────────────────────

  abrirBusquedaTitular(): void {
    const ref = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px', maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    });
    ref.afterClosed().subscribe((t: Titular | null) => { if (t) this.form.titular = t; });
  }

  // ─── GUARDAR ────────────────────────────────────────────────

  guardar(): void {
    if (!this.form.titular) { this.mostrarError('Seleccione un proveedor'); return; }
    if (!this.form.descripcion.trim()) { this.mostrarError('Ingrese la descripción'); return; }
    if (!this.form.valorTotal || this.form.valorTotal <= 0) { this.mostrarError('Ingrese el valor total'); return; }

    const now = new Date().toISOString();
    const payload: Partial<NegociacionProveedor> = {
      ...(this.form.id ? { id: this.form.id } : {}),
      empresa: this.empresa,
      titular: this.form.titular as Titular,
      fechaNegociacion: this.dateToISO(this.fechaNegControl.value) || now.substring(0, 10),
      fechaInicio: this.dateToISO(this.fechaIniControl.value),
      fechaFin: this.dateToISO(this.fechaFinControl.value),
      numContrato: this.form.numContrato || undefined,
      descripcion: this.form.descripcion,
      valorTotal: this.form.valorTotal,
      tipoFinanciacion: this.form.tipoFinanciacion,
      numeroPagos: this.form.numeroPagos,
      observacion: this.form.observacion || undefined,
      estado: this.form.estado,
      usuario: { codigo: this.idUsuario } as any,
      fechaRegistro: this.modoEdicion() ? undefined : now,
      ...(this.modoEdicion() ? { usuarioModif: { codigo: this.idUsuario } as any, fechaModif: now } : {}),
    };

    const op$ = this.modoEdicion()
      ? this.negService.update(payload)
      : this.negService.add(payload);

    op$.subscribe({
      next: (resp) => {
        this.mostrarExito(this.modoEdicion() ? 'Negociación actualizada' : 'Negociación creada');
        this.vista.set('lista');
        this.cargar();
        if (!this.modoEdicion() && resp?.id) {
          this.router.navigate(['/menucuentaxpagar/negociaciones/detalle', resp.id]);
        }
      },
      error: (err) => this.mostrarError('Error al guardar: ' + (err?.message || JSON.stringify(err))),
    });
  }

  eliminar(neg: NegociacionProveedor): void {
    if (!confirm(`¿Eliminar la negociación "${neg.descripcion}"? Esta acción no se puede deshacer.`)) return;
    this.negService.delete(neg.id).subscribe({
      next: () => { this.mostrarExito('Negociación eliminada'); this.cargar(); },
      error: () => this.mostrarError('No se pudo eliminar'),
    });
  }

  // ─── DATEPICKER HELPERS ─────────────────────────────────────

  capturarFechaNegRaw(e: Event): void { this._rawFechaNeg = (e.target as HTMLInputElement).value; }
  syncFechaNegFromRaw(e: FocusEvent): void { this._syncFecha(e, '_rawFechaNeg', this.fechaNegControl, this.fechaNegInputRef); this._rawFechaNeg = ''; }
  onFechaNegPickerChange(d: Date | null | undefined): void { this._onPickerChange(d, this.fechaNegControl, this.fechaNegInputRef); }

  capturarFechaIniRaw(e: Event): void { this._rawFechaIni = (e.target as HTMLInputElement).value; }
  syncFechaIniFromRaw(e: FocusEvent): void { this._syncFecha(e, '_rawFechaIni', this.fechaIniControl, this.fechaIniInputRef); this._rawFechaIni = ''; }
  onFechaIniPickerChange(d: Date | null | undefined): void { this._onPickerChange(d, this.fechaIniControl, this.fechaIniInputRef); }

  capturarFechaFinRaw(e: Event): void { this._rawFechaFin = (e.target as HTMLInputElement).value; }
  syncFechaFinFromRaw(e: FocusEvent): void { this._syncFecha(e, '_rawFechaFin', this.fechaFinControl, this.fechaFinInputRef); this._rawFechaFin = ''; }
  onFechaFinPickerChange(d: Date | null | undefined): void { this._onPickerChange(d, this.fechaFinControl, this.fechaFinInputRef); }

  private _syncFecha(e: FocusEvent, rawProp: string, ctrl: UntypedFormControl, ref: ElementRef<HTMLInputElement>): void {
    const raw = ((this as any)[rawProp] || (e.target as HTMLInputElement)?.value || '').trim();
    const date = this.parseFechaLocal(raw);
    if (date) {
      ctrl.setValue(date, { emitEvent: false });
      const fmt = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
      setTimeout(() => { if (ref?.nativeElement) ref.nativeElement.value = fmt; });
    }
  }

  private _onPickerChange(d: Date | null | undefined, ctrl: UntypedFormControl, ref: ElementRef<HTMLInputElement>): void {
    if (!d) return;
    ctrl.setValue(d, { emitEvent: false });
    const fmt = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (ref?.nativeElement) ref.nativeElement.value = fmt; });
  }

  private setDateControl(ctrl: UntypedFormControl, ref: ElementRef<HTMLInputElement>, val: any, required: boolean): void {
    const d = this.toDate(val);
    if (d) {
      ctrl.setValue(d, { emitEvent: false });
      const fmt = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
      setTimeout(() => { if (ref?.nativeElement) ref.nativeElement.value = fmt; });
    } else if (!required) {
      ctrl.setValue(null, { emitEvent: false });
      setTimeout(() => { if (ref?.nativeElement) ref.nativeElement.value = ''; });
    }
  }

  // ─── UTILIDADES ─────────────────────────────────────────────

  toDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (Array.isArray(value)) { const [y, mo, d, h = 0, m = 0, s = 0] = value as number[]; return new Date(y, mo - 1, d, h, m, s); }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private parseFechaLocal(s: string): Date | null {
    if (!s) return null;
    const parts = s.split('/');
    if (parts.length !== 3) return null;
    const [dia, mes, anio] = parts.map(Number);
    if (isNaN(dia) || isNaN(mes) || isNaN(anio) || anio < 1000) return null;
    const d = new Date(anio, mes - 1, dia);
    return (d.getFullYear() === anio && d.getMonth() === mes - 1 && d.getDate() === dia) ? d : null;
  }

  private dateToISO(val: any): string | undefined {
    const d = this.toDate(val);
    if (!d) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  estadoLabel(e: number): string { return ({ 1: 'Activa', 0: 'Inactiva', 2: 'Suspendida' } as any)[e] ?? String(e); }
  estadoColor(e: number): string { return ({ 1: 'chip-activa', 0: 'chip-inactiva', 2: 'chip-suspendida' } as any)[e] ?? ''; }
  tipoLabel(t: string): string { return ({ FIJO: 'Fijo', HITO: 'Hito', PORCENTAJE: 'Porcentaje', UNICO: 'Único' } as any)[t] ?? t; }
  proveedorLabel(n: NegociacionProveedor): string { return n.titular?.nombre || n.titular?.razonSocial || '—'; }

  private limpiarForm(): void {
    this.form = { id: 0, titular: null, numContrato: '', descripcion: '', valorTotal: 0, tipoFinanciacion: 'PORCENTAJE', numeroPagos: 1, observacion: '', estado: 1 };
    this.fechaNegControl.setValue(new Date(), { emitEvent: false });
    this.fechaIniControl.setValue(null, { emitEvent: false });
    this.fechaFinControl.setValue(null, { emitEvent: false });
  }

  private mostrarExito(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-success'] }); }
  private mostrarError(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] }); }
}
