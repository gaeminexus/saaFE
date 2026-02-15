import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map } from 'rxjs';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { Cargo } from '../../../../model/cargo';
import { CargoService } from '../../../../service/cargo.service';
import { DepartamentoService } from '../../../../service/departamento.service';
import { HistorialService } from '../../../../service/historial.service';
import { CargoFormComponent } from '../cargo-form/cargo-form.component';

@Component({
  selector: 'app-cargo-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './cargo-list.component.html',
  styleUrls: ['./cargo-list.component.scss'],
})
export class CargoListComponent implements OnInit {
  titulo = signal<string>('Parametrizacion · Cargos');
  columns = signal<string[]>(['codigo', 'nombre', 'estado', 'fechaRegistro', 'acciones']);

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Filtros
  filtroCodigo = signal<string>('');
  filtroNombre = signal<string>('');
  filtroEstado = signal<string | null>('A');
  filtroDesde = signal<string>('');
  filtroHasta = signal<string>('');
  orderBy = signal<string>('nombre');
  orderDir = signal<'ASC' | 'DESC'>('ASC');

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  // Datos y paginacion
  allData = signal<Cargo[]>([]);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  constructor(
    private cargoService: CargoService,
    private departamentoCargoService: DepartamentoService,
    private historialService: HistorialService,
  ) {}

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    const criterios = this.buildCriteria();
    this.cargoService.selectByCriteria(criterios).subscribe({
      next: (rows: Cargo[] | null) => {
        const items = Array.isArray(rows) ? rows : [];
        this.allData.set(items);
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar cargos');
        this.showError('Error al cargar cargos');
        this.loading.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroCodigo.set('');
    this.filtroNombre.set('');
    this.filtroEstado.set('A');
    this.filtroDesde.set('');
    this.filtroHasta.set('');
    this.orderBy.set('nombre');
    this.orderDir.set('ASC');
    this.buscar();
  }

  onNuevo(): void {
    const dialogRef = this.dialog.open(CargoFormComponent, {
      width: '640px',
      disableClose: true,
      data: { mode: 'new' },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.buscar();
    });
  }

  onEditar(row: Cargo): void {
    const dialogRef = this.dialog.open(CargoFormComponent, {
      width: '640px',
      disableClose: true,
      data: { mode: 'edit', cargo: row },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.buscar();
    });
  }

  onToggleEstado(row: Cargo): void {
    const nextEstado = this.isActivo(row.estado) ? 'I' : 'A';
    if (nextEstado === 'I') {
      this.validarInactivacion(row.codigo).subscribe((ok: boolean) => {
        if (!ok) return;
        this.actualizarEstado(row, nextEstado);
      });
      return;
    }
    this.actualizarEstado(row, nextEstado);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  estadoLabel(value?: number | string | null): string {
    return this.isActivo(value) ? 'Activo' : 'Inactivo';
  }

  private buildCriteria(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];
    const codigo = this.filtroCodigo().trim();
    if (codigo) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.LONG,
        'codigo',
        codigo,
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(db);
    }

    const nombre = this.normalizeNombre(this.filtroNombre());
    if (nombre) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'nombre',
        nombre,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);
    }

    const estado = this.filtroEstado();
    if (estado !== null && estado !== undefined && estado !== '') {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'estado',
        estado,
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(db);
    }

    const desde = this.filtroDesde();
    const hasta = this.filtroHasta();
    if (desde && hasta) {
      const db = new DatosBusqueda();
      db.asignaUnCampoConBetween(
        'fechaRegistro',
        TipoDatosBusqueda.DATE,
        desde,
        TipoComandosBusqueda.BETWEEN,
        hasta,
      );
      criterios.push(db);
    } else if (desde) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE,
        'fechaRegistro',
        desde,
        TipoComandosBusqueda.MAYOR_IGUAL,
      );
      criterios.push(db);
    } else if (hasta) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE,
        'fechaRegistro',
        hasta,
        TipoComandosBusqueda.MENOR_IGUAL,
      );
      criterios.push(db);
    }

    const orderByField = this.orderBy();
    const order = new DatosBusqueda();
    order.orderBy(orderByField);
    order.setTipoOrden(
      this.orderDir() === 'ASC' ? DatosBusqueda.ORDER_ASC : DatosBusqueda.ORDER_DESC,
    );
    criterios.push(order);

    return criterios;
  }

  private actualizarEstado(row: Cargo, estado: string): void {
    const payload: Partial<Cargo> = {
      codigo: row.codigo,
      estado,
      nombre: row.nombre,
      descripcion: row.descripcion ?? null,
      requisitos: row.requisitos ?? null,
      usuarioRegistro: this.getUsuarioRegistro(),
    };

    this.loading.set(true);
    this.cargoService.update(payload).subscribe({
      next: () => {
        this.showSuccess('Estado actualizado');
        this.buscar();
      },
      error: () => {
        this.showError('Error al actualizar estado');
        this.loading.set(false);
      },
    });
  }

  private validarInactivacion(cargoId: number) {
    const hstrCriteria: DatosBusqueda[] = [];
    const hstrCargo = new DatosBusqueda();
    hstrCargo.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'cargo',
      'codigo',
      String(cargoId),
      TipoComandosBusqueda.IGUAL,
    );
    hstrCriteria.push(hstrCargo);
    const hstrActivo = new DatosBusqueda();
    hstrActivo.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.INTEGER,
      'actual',
      '1',
      TipoComandosBusqueda.IGUAL,
    );
    hstrCriteria.push(hstrActivo);

    return this.historialService.selectByCriteria(hstrCriteria).pipe(
      map((hstrRows) => {
        const hstr = Array.isArray(hstrRows) ? hstrRows : [];
        if (hstr.length) {
          this.showError('No se puede inactivar: existe historial vigente');
          return false;
        }
        return true;
      }),
    );
  }

  private normalizeNombre(value: string): string {
    return (value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  isActivo(value: number | string | null | undefined): boolean {
    if (value === null || value === undefined) return false;
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT');
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
