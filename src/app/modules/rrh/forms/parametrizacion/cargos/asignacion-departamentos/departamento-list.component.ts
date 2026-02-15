import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { Departamento } from '../../../../model/departamento';
import { DepartamentoService } from '../../../../service/departamento.service';
import { DepartamentoFormComponent } from './departamento-form.component';

@Component({
  selector: 'app-departamento-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './departamento-list.component.html',
  styleUrls: ['./departamento-list.component.scss'],
})
export class DepartamentoListComponent implements OnInit {
  titulo = signal<string>('Departamentos');
  columns = signal<string[]>(['nombre', 'estado', 'acciones']);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Filtros
  filtroNombre = signal<string>('');
  filtroEstado = signal<string | null>('A');

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  allData = signal<Departamento[]>([]);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  constructor(private departamentoService: DepartamentoService) {}

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.loading.set(true);
    this.departamentoService.getAll().subscribe({
      next: (rows: Departamento[] | null) => {
        const items = this.applyFilters(rows);
        this.allData.set(items);
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: () => {
        this.showError('Error al cargar departamentos');
        this.loading.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroNombre.set('');
    this.filtroEstado.set('A');
    this.buscar();
  }

  onNuevo(): void {
    this.openForm('new');
  }

  onEditar(row: Departamento): void {
    this.openForm('edit', row);
  }

  onToggleEstado(row: Departamento): void {
    const next = this.isActivo(row.estado) ? 'I' : 'A';
    const payload: Partial<Departamento> = {
      codigo: row.codigo,
      nombre: row.nombre,
      estado: next,
      usuarioRegistro: this.getUsuarioRegistro(),
    };

    this.loading.set(true);
    this.departamentoService.update(payload).subscribe({
      next: () => {
        this.showSuccess('Estado actualizado');
        this.buscar();
      },
      error: () => {
        this.showError('Error al actualizar');
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

  isActivo(estado?: string | number | null): boolean {
    if (estado === null || estado === undefined) return false;
    const value = estado.toString().toUpperCase();
    return value === '1' || value === 'A' || value.startsWith('ACT');
  }

  private applyFilters(rows: Departamento[] | null): Departamento[] {
    const items = Array.isArray(rows) ? rows : [];
    const nombre = this.filtroNombre().trim().toUpperCase();
    const estado = this.filtroEstado();

    const filtered = items.filter((row) => {
      const rowNombre = (row?.nombre ?? '').toString().toUpperCase();
      const matchNombre = !nombre || rowNombre.includes(nombre);

      if (estado === null || estado === undefined || estado === '') {
        return matchNombre;
      }

      const matchEstado = this.normalizeEstado(row?.estado) === estado;
      return matchNombre && matchEstado;
    });

    return filtered.sort((a, b) => {
      const nameA = (a?.nombre ?? '').toString().toUpperCase();
      const nameB = (b?.nombre ?? '').toString().toUpperCase();
      return nameA.localeCompare(nameB);
    });
  }

  private normalizeEstado(value?: string | number | null): string {
    if (value === null || value === undefined) return 'I';
    const normalized = value.toString().toUpperCase();
    if (normalized === '1' || normalized === 'A' || normalized.startsWith('ACT')) {
      return 'A';
    }
    return 'I';
  }

  private openForm(mode: 'new' | 'edit', row?: Departamento): void {
    const dialogRef = this.dialog.open(DepartamentoFormComponent, {
      width: '640px',
      disableClose: true,
      data: { mode, item: row ?? null },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.buscar();
    });
  }

  private getUsuarioRegistro(): string {
    const raw =
      localStorage.getItem('usuarioRegistro') ||
      localStorage.getItem('usuario') ||
      localStorage.getItem('username') ||
      localStorage.getItem('user') ||
      'web';
    return String(raw).substring(0, 59);
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
}
