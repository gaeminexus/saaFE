import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DepartamentoCargo } from '../../../../model/departamento-cargo';
import { DepartementoCargoService } from '../../../../service/departemento-cargo.service';
import { DepartamentoCargoFormComponent } from './departamento-cargo-form.component';

@Component({
  selector: 'app-departamento-cargo-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './departamento-cargo-list.component.html',
  styleUrls: ['./departamento-cargo-list.component.scss'],
})
export class DepartamentoCargoListComponent implements OnInit {
  titulo = signal<string>('Departamento - Cargo');
  columns = signal<string[]>([
    'codigo',
    'departamento',
    'cargo',
    'estado',
    'fechaRegistro',
    'usuarioRegistro',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Filtros
  filtroDepartamento = signal<string>('');
  filtroCargo = signal<string>('');
  filtroEstado = signal<string | null>('A');
  orderBy = signal<string>('fechaRegistro');
  orderDir = signal<'ASC' | 'DESC'>('DESC');

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  allData = signal<DepartamentoCargo[]>([]);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  constructor(private departamentoCargoService: DepartementoCargoService) {}

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.loading.set(true);
    const criterios = this.buildCriteria();
    this.departamentoCargoService.selectByCriteria(criterios).subscribe({
      next: (rows: DepartamentoCargo[] | null) => {
        const items = Array.isArray(rows) ? rows : [];
        const filtered = this.applyEstadoFilter(items);
        this.allData.set(this.applyLocalSort(filtered));
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al cargar asociaciones');
        this.loading.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroDepartamento.set('');
    this.filtroCargo.set('');
    this.filtroEstado.set('A');
    this.orderBy.set('fechaRegistro');
    this.orderDir.set('DESC');
    this.buscar();
  }

  onNuevo(): void {
    this.openForm('new');
  }

  onEditar(row: DepartamentoCargo): void {
    this.openForm('edit', row);
  }

  onToggleEstado(row: DepartamentoCargo): void {
    const next = this.isActivo(row.estado) ? 'I' : 'A';
    const departamento = this.resolveDepartamento(row);
    const cargo = this.resolveCargo(row);
    const payload = {
      codigo: row.codigo,
      departamento,
      cargo,
      estado: next,
      fechaRegistro: row.fechaRegistro,
      usuarioRegistro: this.getUsuarioRegistro(),
    } as Partial<DepartamentoCargo> & {
      departamento?: DepartamentoCargo['Departamento'];
      cargo?: DepartamentoCargo['Cargo'];
    };

    this.loading.set(true);
    this.departamentoCargoService.update(payload).subscribe({
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

  isActivo(estado?: string | number | null): boolean {
    if (estado === null || estado === undefined) return false;
    const value = estado.toString().toUpperCase();
    return value === '1' || value === 'A' || value.startsWith('ACT');
  }

  private buildCriteria(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];
    const departamento = this.normalizeText(this.filtroDepartamento());
    if (departamento) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatosBusqueda.STRING,
        'departamento',
        'nombre',
        departamento,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);
    }

    const cargo = this.normalizeText(this.filtroCargo());
    if (cargo) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatosBusqueda.STRING,
        'cargo',
        'nombre',
        cargo,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);
    }

    const order = new DatosBusqueda();
    order.orderBy(this.orderBy());
    order.setTipoOrden(
      this.orderDir() === 'ASC' ? DatosBusqueda.ORDER_ASC : DatosBusqueda.ORDER_DESC,
    );
    criterios.push(order);

    return criterios;
  }

  private applyLocalSort(rows: DepartamentoCargo[]): DepartamentoCargo[] {
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

  private applyEstadoFilter(rows: DepartamentoCargo[]): DepartamentoCargo[] {
    const estado = this.filtroEstado();
    if (!estado) return rows;
    const wantsActivo = estado.toString().toUpperCase().startsWith('A');
    return rows.filter((row) =>
      wantsActivo ? this.isActivo(row?.estado) : !this.isActivo(row?.estado),
    );
  }

  private getSortValue(row: DepartamentoCargo, field: string): string | number {
    switch (field) {
      case 'codigo':
        return row?.codigo ?? 0;
      case 'estado':
        return (row?.estado ?? '').toString().toUpperCase();
      case 'Departamento.nombre':
        return this.departamentoNombre(row).toUpperCase();
      case 'Cargo.nombre':
        return this.cargoNombre(row).toUpperCase();
      case 'fechaRegistro':
        return row?.fechaRegistro ? new Date(row.fechaRegistro).getTime() : 0;
      case 'usuarioRegistro':
        return (row?.usuarioRegistro ?? '').toString().toUpperCase();
      default:
        return (row?.codigo ?? 0) as number;
    }
  }

  private normalizeEstado(value?: string | number | null): string {
    if (value === null || value === undefined) return 'I';
    const normalized = value.toString().toUpperCase();
    if (normalized === '1' || normalized === 'A' || normalized.startsWith('ACT')) {
      return 'A';
    }
    return 'I';
  }

  private openForm(mode: 'new' | 'edit', row?: DepartamentoCargo): void {
    const dialogRef = this.dialog.open(DepartamentoCargoFormComponent, {
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

  departamentoNombre(row?: DepartamentoCargo | null): string {
    const item = row as DepartamentoCargo & { departamento?: DepartamentoCargo['Departamento'] };
    return (item?.Departamento?.nombre ?? item?.departamento?.nombre ?? '').toString();
  }

  cargoNombre(row?: DepartamentoCargo | null): string {
    const item = row as DepartamentoCargo & { cargo?: DepartamentoCargo['Cargo'] };
    return (item?.Cargo?.nombre ?? item?.cargo?.nombre ?? '').toString();
  }

  private resolveDepartamento(row: DepartamentoCargo): DepartamentoCargo['Departamento'] {
    const item = row as DepartamentoCargo & { departamento?: DepartamentoCargo['Departamento'] };
    return item.Departamento ?? item.departamento ?? ({} as DepartamentoCargo['Departamento']);
  }

  private resolveCargo(row: DepartamentoCargo): DepartamentoCargo['Cargo'] {
    const item = row as DepartamentoCargo & { cargo?: DepartamentoCargo['Cargo'] };
    return item.Cargo ?? item.cargo ?? ({} as DepartamentoCargo['Cargo']);
  }

  private normalizeText(value: string): string {
    return (value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
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
