import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TipoContratoEmpleado } from '../../../model/tipo-contrato-empleado';
import { TipoContratoEmpleadoService } from '../../../service/tipo-contrato-empleado.service';
import { TipoContratoFormComponent } from './tipo-contrato-form.component';

@Component({
  selector: 'app-tipo-contrato-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './tipo-contrato-list.component.html',
  styleUrls: ['./tipo-contrato-list.component.scss'],
})
export class TipoContratoListComponent implements OnInit {
  titulo = signal<string>('Parametrizacion · Tipos de Contrato');
  columns = signal<string[]>([
    'codigo',
    'nombre',
    'requiereFechaFin',
    'estado',
    'fechaRegistro',
    'usuarioRegistro',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  filtroNombre = signal<string>('');
  filtroEstado = signal<string | null>('1');
  filtroRequiere = signal<string | null>(null);
  orderBy = signal<string>('codigo');
  orderDir = signal<'ASC' | 'DESC'>('ASC');

  estadoOptions = [
    { value: '1', label: 'Activo' },
    { value: '0', label: 'Inactivo' },
  ];

  requiereOptions = [
    { value: '1', label: 'Si' },
    { value: '0', label: 'No' },
  ];

  allData = signal<TipoContratoEmpleado[]>([]);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  constructor(private tipoContratoService: TipoContratoEmpleadoService) {}

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.loading.set(true);
    const criterios = this.buildOrderCriteria();
    this.tipoContratoService.selectByCriteria(criterios).subscribe({
      next: (rows: TipoContratoEmpleado[] | null) => {
        const items = this.extractRows(rows);
        const filtered = this.applyLocalFilters(items);
        this.allData.set(this.applyLocalSort(filtered));
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al cargar tipos de contrato');
        this.loading.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroNombre.set('');
    this.filtroEstado.set('1');
    this.filtroRequiere.set(null);
    this.orderBy.set('codigo');
    this.orderDir.set('ASC');
    this.buscar();
  }

  onNuevo(): void {
    this.openForm('new');
  }

  onEditar(row: TipoContratoEmpleado): void {
    this.openForm('edit', row);
  }

  onToggleEstado(row: TipoContratoEmpleado): void {
    const next = this.isActivo(row.estado as string) ? '0' : '1';
    const payload: Partial<TipoContratoEmpleado> = {
      codigo: row.codigo,
      nombre: row.nombre,
      requiereFechaFin: row.requiereFechaFin,
      estado: next,
      fechaRegistro: row.fechaRegistro,
    };

    console.log('[TipoContratoList] toggle estado', { codigo: row.codigo, next, payload });

    this.loading.set(true);
    this.tipoContratoService.update(payload).subscribe({
      next: () => {
        this.showSuccess('Estado actualizado');
        this.buscar();
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al actualizar');
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  estadoLabel(value?: string | number | null): string {
    return this.isActivo(value) ? 'Activo' : 'Inactivo';
  }

  requiereLabel(value?: string | number | boolean | null): string {
    return this.isRequiere(value) ? 'Si' : 'No';
  }

  isActivo(value?: string | number | null): boolean {
    if (value === null || value === undefined) return false;
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT');
  }

  private isRequiere(value?: string | number | boolean | null): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'S' || normalized === 'SI' || normalized === 'TRUE';
  }

  private toBackendRequiere(value?: string | null): string | null {
    if (value === null || value === undefined || value === '') return null;
    return value;
  }

  private buildOrderCriteria(): DatosBusqueda[] {
    const order = new DatosBusqueda();
    order.orderBy(this.orderBy());
    order.setTipoOrden(
      this.orderDir() === 'ASC' ? DatosBusqueda.ORDER_ASC : DatosBusqueda.ORDER_DESC,
    );
    return [order];
  }

  private applyLocalFilters(rows: TipoContratoEmpleado[]): TipoContratoEmpleado[] {
    const nombre = this.normalizeText(this.filtroNombre());
    const estado = this.filtroEstado();
    const requiere = this.toBackendRequiere(this.filtroRequiere());

    return rows.filter((row) => {
      const nombreOk = !nombre
        ? true
        : this.normalizeText((row?.nombre ?? '') as string).includes(nombre);

      const estadoOk = !estado
        ? true
        : estado === '1'
          ? this.isActivo(row?.estado as string)
          : !this.isActivo(row?.estado as string);

      const requiereOk =
        requiere === null
          ? true
          : requiere === '1'
            ? this.isRequiere(row?.requiereFechaFin as string)
            : !this.isRequiere(row?.requiereFechaFin as string);

      return nombreOk && estadoOk && requiereOk;
    });
  }

  private extractRows(rows: TipoContratoEmpleado[] | null): TipoContratoEmpleado[] {
    if (Array.isArray(rows)) return rows;
    if (!rows) return [];
    const wrapped = rows as unknown as {
      data?: TipoContratoEmpleado[];
      rows?: TipoContratoEmpleado[];
      contenido?: TipoContratoEmpleado[];
    };
    if (Array.isArray(wrapped.data)) return wrapped.data;
    if (Array.isArray(wrapped.rows)) return wrapped.rows;
    if (Array.isArray(wrapped.contenido)) return wrapped.contenido;
    return [];
  }

  private applyLocalSort(rows: TipoContratoEmpleado[]): TipoContratoEmpleado[] {
    const orderBy = this.orderBy();
    const dir = this.orderDir() === 'ASC' ? 1 : -1;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const left = this.getSortValue(a, orderBy);
      const right = this.getSortValue(b, orderBy);
      if (left < right) return -1 * dir;
      if (left > right) return 1 * dir;
      return 0;
    });
    return sorted;
  }

  private getSortValue(row: TipoContratoEmpleado, field: string): string | number {
    switch (field) {
      case 'codigo':
        return row?.codigo ?? 0;
      case 'nombre':
        return (row?.nombre ?? '').toString().toUpperCase();
      case 'requiereFechaFin':
        return this.isRequiere(row?.requiereFechaFin as string) ? 1 : 0;
      case 'estado':
        return (row?.estado ?? '').toString().toUpperCase();
      case 'fechaRegistro':
        return row?.fechaRegistro ? new Date(row.fechaRegistro).getTime() : 0;
      case 'usuarioRegistro':
        return (row?.usuarioRegistro ?? '').toString().toUpperCase();
      default:
        return (row?.codigo ?? 0) as number;
    }
  }

  private normalizeText(value: string | null | undefined): string {
    return ((value ?? '') as string).replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private openForm(mode: 'new' | 'edit', row?: TipoContratoEmpleado): void {
    const dialogRef = this.dialog.open(TipoContratoFormComponent, {
      width: '640px',
      disableClose: true,
      data: { mode, item: row ?? null },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.buscar();
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3500,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  private extractError(error: unknown): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    const err = error as { message?: string; error?: any };
    if (typeof err?.message === 'string') return err.message;
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    return '';
  }
}
