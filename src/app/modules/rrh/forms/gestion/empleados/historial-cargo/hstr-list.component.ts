import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { Cargo } from '../../../../model/cargo';
import { Departamento } from '../../../../model/departamento';
import { Empleado } from '../../../../model/empleado';
import { Historial } from '../../../../model/historial';
import { CargoService } from '../../../../service/cargo.service';
import { DepartamentoService } from '../../../../service/departamento.service';
import { EmpleadoService } from '../../../../service/empleado.service';
import { HistorialService } from '../../../../service/historial.service';
import { HstrDialogComponent, HstrOption } from './hstr-dialog.component';

@Component({
  selector: 'app-hstr-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './hstr-list.component.html',
  styleUrls: ['./hstr-list.component.scss'],
})
export class HstrListComponent implements OnInit {
  titulo = signal<string>('Historial de Cargo');
  columns = signal<string[]>(['cargo', 'departamento', 'inicio', 'fin', 'activo', 'acciones']);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  empleados = signal<Empleado[]>([]);
  departamentos = signal<Departamento[]>([]);
  cargos = signal<Cargo[]>([]);

  filtroEmpleado = signal<number | null>(null);

  allData = signal<Historial[]>([]);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  ngOnInit(): void {
    this.loadCombos();
  }

  constructor(
    private empleadoService: EmpleadoService,
    private departamentoService: DepartamentoService,
    private cargoService: CargoService,
    private historialService: HistorialService,
  ) {}

  loadCombos(): void {
    this.empleadoService.selectByCriteria([]).subscribe({
      next: (rows: Empleado[] | null) => this.empleados.set(Array.isArray(rows) ? rows : []),
    });

    this.departamentoService.selectByCriteria([]).subscribe({
      next: (rows: Departamento[] | null) =>
        this.departamentos.set(Array.isArray(rows) ? rows : []),
    });

    const criterios: DatosBusqueda[] = [];
    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.INTEGER,
      'estado',
      '1',
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEstado);

    this.cargoService.selectByCriteria(criterios).subscribe({
      next: (rows: Cargo[] | null) => this.cargos.set(Array.isArray(rows) ? rows : []),
    });
  }

  buscar(): void {
    const empleadoId = this.filtroEmpleado();
    if (!empleadoId) {
      this.allData.set([]);
      return;
    }

    this.loading.set(true);
    const criterios: DatosBusqueda[] = [];
    const dbEmp = new DatosBusqueda();
    dbEmp.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      String(empleadoId),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEmp);

    const order = new DatosBusqueda();
    order.orderBy('fechaInicio');
    order.setTipoOrden(DatosBusqueda.ORDER_DESC);
    criterios.push(order);

    this.historialService.selectByCriteria(criterios).subscribe({
      next: (rows: Historial[] | null) => {
        const items = Array.isArray(rows) ? rows : [];
        this.allData.set(items);
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: () => {
        this.showError('Error al cargar historial');
        this.loading.set(false);
      },
    });
  }

  onCambiarCargo(): void {
    const empleadoId = this.filtroEmpleado();
    if (!empleadoId) {
      this.showError('Seleccione un empleado');
      return;
    }

    const dialogRef = this.dialog.open(HstrDialogComponent, {
      width: '680px',
      disableClose: true,
      data: {
        mode: 'new',
        empleadoId,
        empleadoLabel: this.empleadoLabel(empleadoId),
        departamentos: this.departamentoOptions(),
        cargos: this.cargoOptions(),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result?.payload) return;
      this.guardarCambioCargo(result.payload as Historial);
    });
  }

  onEditar(row: Historial): void {
    const empleadoId = this.filtroEmpleado();
    if (!empleadoId) return;

    const dialogRef = this.dialog.open(HstrDialogComponent, {
      width: '680px',
      disableClose: true,
      data: {
        mode: 'edit',
        empleadoId,
        empleadoLabel: this.empleadoLabel(empleadoId),
        departamentos: this.departamentoOptions(),
        cargos: this.cargoOptions(),
        historial: row,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result?.payload) return;
      this.guardarEdicion(result.payload as Historial, result.original as Historial);
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  empleadoLabel(code: number): string {
    const match = this.empleados().find((e) => e.codigo === code);
    if (!match) return String(code);
    const apellidos = (match.apellidos ?? '').toString().trim();
    const nombres = (match.nombres ?? '').toString().trim();
    return `${apellidos} ${nombres}`.trim();
  }

  cargoLabel(cargo?: Cargo | null): string {
    return cargo?.nombre ?? String(cargo?.codigo ?? '');
  }

  departamentoLabel(departamento?: Departamento | null): string {
    return departamento?.nombre ?? String(departamento?.codigo ?? '');
  }

  private departamentoOptions(): HstrOption[] {
    return this.departamentos().map((d) => ({
      value: d.codigo,
      label: d.nombre,
    }));
  }

  private cargoOptions(): HstrOption[] {
    return this.cargos().map((c) => ({
      value: c.codigo,
      label: c.nombre,
    }));
  }

  private guardarCambioCargo(payload: Historial): void {
    if (this.hasOverlap(payload, null)) {
      this.showError('Existe solapamiento de fechas para este empleado');
      return;
    }

    const activo = this.allData().find((h) => Number(h.actual) === 1);
    const hoy = payload.fechaInicio as string;

    const closeActive = activo
      ? this.historialService.update({
          ...activo,
          fechaFin: hoy,
          actual: 0,
          usuarioRegistro: this.getUsuarioRegistro(),
        })
      : undefined;

    if (closeActive) {
      closeActive.subscribe({
        next: () => this.insertarHistorial(payload),
        error: () => this.showError('Error al cerrar historial activo'),
      });
    } else {
      this.insertarHistorial(payload);
    }
  }

  private guardarEdicion(payload: Historial, original: Historial): void {
    const updated: Historial = {
      ...original,
      ...payload,
      usuarioRegistro: this.getUsuarioRegistro(),
    };

    if (this.hasOverlap(updated, original)) {
      this.showError('Existe solapamiento de fechas para este empleado');
      return;
    }

    if (Number(updated.actual) === 1) {
      const otherActive = this.allData().find(
        (h) => Number(h.actual) === 1 && h.codigo !== original.codigo,
      );
      if (otherActive) {
        this.showError('Solo puede existir un cargo activo por empleado');
        return;
      }
    }

    this.historialService.update(updated).subscribe({
      next: () => {
        this.showSuccess('Historial actualizado');
        this.buscar();
      },
      error: () => this.showError('Error al actualizar historial'),
    });
  }

  private insertarHistorial(payload: Historial): void {
    const nuevo: Historial = {
      ...payload,
      actual: 1,
      usuarioRegistro: this.getUsuarioRegistro(),
    };

    this.historialService.add(nuevo).subscribe({
      next: () => {
        this.showSuccess('Cambio de cargo registrado');
        this.buscar();
      },
      error: () => this.showError('Error al registrar cambio de cargo'),
    });
  }

  private hasOverlap(candidate: Historial, original: Historial | null): boolean {
    const start = this.parseDate(candidate.fechaInicio);
    const end = candidate.fechaFin ? this.parseDate(candidate.fechaFin) : null;

    return this.allData().some((h) => {
      if (original && h.codigo === original.codigo) return false;
      const hStart = this.parseDate(h.fechaInicio);
      const hEnd = h.fechaFin ? this.parseDate(h.fechaFin) : null;
      if (!start || !hStart) return false;
      const endDate = end ?? start;
      const hEndDate = hEnd ?? hStart;
      return start <= hEndDate && hStart <= endDate;
    });
  }

  private parseDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
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
