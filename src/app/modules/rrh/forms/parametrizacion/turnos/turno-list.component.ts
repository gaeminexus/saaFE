import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Turno } from '../../../model/turno';
import { TurnoService } from '../../../service/turno.service';
import { TurnoFormComponent } from './turno-form.component';

@Component({
  selector: 'app-turno-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './turno-list.component.html',
  styleUrls: ['./turno-list.component.scss'],
})
export class TurnoListComponent implements OnInit {
  titulo = signal<string>('Parametrizacion · Turnos y Horarios');
  columns = signal<string[]>([
    'codigo',
    'nombre',
    'horaEntrada',
    'horaSalida',
    'toleranciaMinutos',
    'requiereMarcacionSalida',
    'estado',
    'fechaRegistro',
    'usuarioRegistro',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  filtroNombre = signal<string>('');
  filtroEstado = signal<string | null>('A');
  filtroHoraInicio = signal<string>('');
  filtroHoraFin = signal<string>('');
  filtroRequiere = signal<string | null>(null);
  orderBy = signal<string>('nombre');
  orderDir = signal<'ASC' | 'DESC'>('ASC');

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  requiereOptions = [
    { value: '1', label: 'Si' },
    { value: '0', label: 'No' },
  ];

  allData = signal<Turno[]>([]);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  constructor(private turnoService: TurnoService) {}

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.loading.set(true);
    const criterios = this.buildCriteria();
    this.turnoService.selectByCriteria(criterios).subscribe({
      next: (rows: Turno[] | null) => {
        const items = this.extractRows(rows);
        const filtered = this.applyLocalFilters(items);
        this.allData.set(this.applyLocalSort(filtered));
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al cargar turnos');
        this.loading.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroNombre.set('');
    this.filtroEstado.set('A');
    this.filtroHoraInicio.set('');
    this.filtroHoraFin.set('');
    this.filtroRequiere.set(null);
    this.orderBy.set('nombre');
    this.orderDir.set('ASC');
    this.buscar();
  }

  onNuevo(): void {
    this.openForm('new');
  }

  onEditar(row: Turno): void {
    this.openForm('edit', row);
  }

  onToggleEstado(row: Turno): void {
    const next = this.isActivo(row.estado as string) ? 'I' : 'A';
    const payload: Partial<Turno> = {
      codigo: row.codigo,
      nombre: row.nombre,
      horaEntrada: row.horaEntrada,
      horaSalida: row.horaSalida,
      toleranciaMinutos: row.toleranciaMinutos,
      requiereMarcacionSalida: this.isRequiere(row.requiereMarcacionSalida),
      estado: next,
      fechaRegistro: row.fechaRegistro,
    };

    this.loading.set(true);
    this.turnoService.update(payload).subscribe({
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

  private toBackendRequiere(value?: string | number | boolean | null): string {
    return this.isRequiere(value) ? '1' : '0';
  }

  private buildCriteria(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];
    const nombre = this.normalizeText(this.filtroNombre());
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

    const requiere = this.filtroRequiere();
    if (requiere !== null) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'requiereMarcacionSalida',
        requiere,
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(db);
    }

    const horaInicio = this.normalizeHora(this.filtroHoraInicio());
    const horaFin = this.normalizeHora(this.filtroHoraFin());
    if (horaInicio && horaFin) {
      const db = new DatosBusqueda();
      db.asignaUnCampoConBetween(
        'horaEntrada',
        TipoDatosBusqueda.STRING,
        horaInicio,
        TipoComandosBusqueda.BETWEEN,
        horaFin,
      );
      criterios.push(db);
    } else if (horaInicio) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'horaEntrada',
        horaInicio,
        TipoComandosBusqueda.MAYOR_IGUAL,
      );
      criterios.push(db);
    } else if (horaFin) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'horaEntrada',
        horaFin,
        TipoComandosBusqueda.MENOR_IGUAL,
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

  private applyLocalFilters(rows: Turno[]): Turno[] {
    const nombre = this.normalizeText(this.filtroNombre());
    const estado = this.filtroEstado();
    const requiere = this.filtroRequiere();
    const horaInicio = this.normalizeHora(this.filtroHoraInicio());
    const horaFin = this.normalizeHora(this.filtroHoraFin());
    const inicioMin = this.parseTimeToMinutes(horaInicio);
    const finMin = this.parseTimeToMinutes(horaFin);

    return rows.filter((row) => {
      const nombreOk = !nombre ? true : this.normalizeText(row?.nombre ?? '').includes(nombre);

      const estadoOk = !estado
        ? true
        : estado === 'A'
          ? this.isActivo(row?.estado as string)
          : !this.isActivo(row?.estado as string);

      const requiereOk =
        requiere === null
          ? true
          : requiere === '1'
            ? this.isRequiere(row?.requiereMarcacionSalida)
            : !this.isRequiere(row?.requiereMarcacionSalida);

      const horaOk = this.matchHoraRange(row?.horaEntrada ?? '', inicioMin, finMin);

      return nombreOk && estadoOk && requiereOk && horaOk;
    });
  }

  private applyLocalSort(rows: Turno[]): Turno[] {
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

  private getSortValue(row: Turno, field: string): string | number {
    switch (field) {
      case 'codigo':
        return row?.codigo ?? 0;
      case 'nombre':
        return (row?.nombre ?? '').toString().toUpperCase();
      case 'horaEntrada':
        return this.parseTimeToMinutes(row?.horaEntrada) ?? 0;
      case 'horaSalida':
        return this.parseTimeToMinutes(row?.horaSalida) ?? 0;
      case 'toleranciaMinutos':
        return row?.toleranciaMinutos ?? 0;
      case 'requiereMarcacionSalida':
        return this.isRequiere(row?.requiereMarcacionSalida) ? 1 : 0;
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

  private matchHoraRange(value: string, inicioMin: number | null, finMin: number | null): boolean {
    if (inicioMin === null && finMin === null) return true;
    const current = this.parseTimeToMinutes(value);
    if (current === null) return false;
    if (inicioMin !== null && current < inicioMin) return false;
    if (finMin !== null && current > finMin) return false;
    return true;
  }

  private parseTimeToMinutes(value?: string | null): number | null {
    if (!value) return null;
    const parts = value.split(':');
    if (parts.length < 2) return null;
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  private normalizeHora(value?: string | null): string {
    return (value ?? '').trim();
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private extractRows(rows: Turno[] | null): Turno[] {
    if (Array.isArray(rows)) return rows;
    if (!rows) return [];
    const wrapped = rows as unknown as {
      data?: Turno[];
      rows?: Turno[];
      contenido?: Turno[];
    };
    if (Array.isArray(wrapped.data)) return wrapped.data;
    if (Array.isArray(wrapped.rows)) return wrapped.rows;
    if (Array.isArray(wrapped.contenido)) return wrapped.contenido;
    return [];
  }

  private openForm(mode: 'new' | 'edit', row?: Turno): void {
    const dialogRef = this.dialog.open(TurnoFormComponent, {
      width: '720px',
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
