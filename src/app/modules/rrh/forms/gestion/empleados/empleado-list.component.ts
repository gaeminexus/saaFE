import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { Empleado } from '../../../model/empleado';
import { EmpleadoService } from '../../../service/empleado.service';
import { EmpleadoFormComponent } from './empleado-form.component';

@Component({
  selector: 'app-empleado-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './empleado-list.component.html',
  styleUrls: ['./empleado-list.component.scss'],
})
export class EmpleadoListComponent implements OnInit {
  titulo = signal<string>('Gestion de Personal · Empleados');
  columns = signal<string[]>([
    'codigo',
    'identificacion',
    'empleado',
    'estado',
    'fechaNacimiento',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  filtroNombres = signal<string>('');
  filtroApellidos = signal<string>('');
  filtroEstado = signal<string | null>('A');
  orderBy = signal<string>('apellidos');
  orderDir = signal<'ASC' | 'DESC'>('ASC');

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  identificaciones = signal<DetalleRubro[]>([]);

  private readonly RUBRO_TIPO_IDENTIFICACION = 36;

  allData = signal<Empleado[]>([]);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  constructor(
    private empleadoService: EmpleadoService,
    private detalleRubroService: DetalleRubroService,
  ) {}

  ngOnInit(): void {
    this.loadIdentificaciones();
    this.buscar();
  }

  buscar(): void {
    this.loading.set(true);
    const criterios = this.buildCriteria();
    this.empleadoService.selectByCriteria(criterios).subscribe({
      next: (rows: Empleado[] | null) => {
        const items = this.extractRows(rows);
        this.allData.set(items);
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al cargar empleados');
        this.loading.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroNombres.set('');
    this.filtroApellidos.set('');
    this.filtroEstado.set('A');
    this.orderBy.set('apellidos');
    this.orderDir.set('ASC');
    this.buscar();
  }

  onNuevo(): void {
    this.openForm('new');
  }

  onEditar(row: Empleado): void {
    this.openForm('edit', row);
  }

  onHistorial(): void {
    this.router.navigate(['/menurecursoshumanos/gestion/empleados/historial-cargo']);
  }

  onToggleEstado(row: Empleado): void {
    const next = this.isActivo(row.estado as string) ? 'I' : 'A';
    const payload: Partial<Empleado> & { identificacion?: number | string } = {
      codigo: row.codigo,
      nombres: row.nombres,
      apellidos: row.apellidos,
      fechaNacimiento: row.fechaNacimiento,
      telefono: row.telefono,
      email: row.email,
      direccion: row.direccion,
      estado: next,
      fechaRegistro: row.fechaRegistro,
      usuarioRegistro: this.getUsuarioRegistro(),
    };

    const identificacion = this.getIdentificacionValue(row);
    if (identificacion !== null && identificacion !== undefined) {
      payload.identificacion = identificacion;
    }

    this.loading.set(true);
    this.empleadoService.update(payload).subscribe({
      next: () => {
        this.showSuccess('Estado actualizado');
        this.buscar();
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'No se pudo actualizar');
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

  empleadoLabel(row: Empleado): string {
    const apellidos = (row?.apellidos ?? '').toString().trim();
    const nombres = (row?.nombres ?? '').toString().trim();
    return `${apellidos} ${nombres}`.trim();
  }

  identificacionLabel(row: Empleado): string {
    const value = this.getIdentificacionRaw(row);
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      const item = value as DetalleRubro;
      return item.descripcion ?? item.valorAlfanumerico ?? item.codigoAlterno?.toString() ?? '';
    }

    const items = this.identificaciones();
    const needle = value.toString();
    const match =
      items.find((item) => item.codigoAlterno?.toString() === needle) ??
      items.find((item) => item.valorNumerico?.toString() === needle) ??
      items.find((item) => item.valorAlfanumerico?.toString() === needle) ??
      items.find((item) => item.descripcion?.toString().toUpperCase() === needle.toUpperCase());

    return match?.descripcion ?? match?.valorAlfanumerico ?? value.toString();
  }

  isActivo(value?: string | number | null): boolean {
    if (value === null || value === undefined) return false;
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT');
  }

  private buildCriteria(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];

    const nombres = this.normalizeText(this.filtroNombres());
    if (nombres) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'nombres',
        nombres,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);
    }

    const apellidos = this.normalizeText(this.filtroApellidos());
    if (apellidos) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'apellidos',
        apellidos,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);
    }

    const estado = this.filtroEstado();
    if (estado) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'estado',
        estado,
        TipoComandosBusqueda.IGUAL,
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

  private loadIdentificaciones(): void {
    const cached = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION);
    if (cached.length) {
      this.identificaciones.set(cached);
      return;
    }

    this.detalleRubroService.inicializar().subscribe({
      next: () =>
        this.identificaciones.set(
          this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION),
        ),
      error: () => this.identificaciones.set([]),
    });
  }

  private getIdentificacionRaw(row: Empleado): DetalleRubro | string | number | null {
    const raw = row?.identificacion ?? null;
    return raw ?? null;
  }

  private getIdentificacionValue(row: Empleado): number | string | null {
    const raw = this.getIdentificacionRaw(row);
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'object' && 'codigoAlterno' in raw) {
      const item = raw as DetalleRubro;
      return item.codigoAlterno ?? null;
    }
    return raw;
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private extractRows<T>(rows: T[] | null): T[] {
    if (Array.isArray(rows)) return rows;
    if (!rows) return [];
    const wrapped = rows as unknown as {
      data?: T[];
      rows?: T[];
      contenido?: T[];
    };
    if (Array.isArray(wrapped.data)) return wrapped.data;
    if (Array.isArray(wrapped.rows)) return wrapped.rows;
    if (Array.isArray(wrapped.contenido)) return wrapped.contenido;
    return [];
  }

  private getUsuarioRegistro(): string {
    const raw =
      localStorage.getItem('usuarioRegistro') ||
      localStorage.getItem('usuario') ||
      localStorage.getItem('username') ||
      localStorage.getItem('user') ||
      'web';

    const text = String(raw ?? '').trim();
    if (!text) return 'web';

    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown> | Array<Record<string, unknown>>;
        const user = Array.isArray(parsed) ? parsed[0] : parsed;
        const candidate =
          (user?.['username'] as string) ||
          (user?.['usuario'] as string) ||
          (user?.['login'] as string) ||
          (user?.['nombre'] as string) ||
          (user?.['email'] as string);
        if (candidate) return String(candidate).substring(0, 59);
      } catch {
        return 'web';
      }
    }

    return text.substring(0, 59);
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

  private openForm(mode: 'new' | 'edit', row?: Empleado): void {
    const dialogRef = this.dialog.open(EmpleadoFormComponent, {
      width: '980px',
      disableClose: true,
      data: { mode, item: row ?? null },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.buscar();
    });
  }
}
