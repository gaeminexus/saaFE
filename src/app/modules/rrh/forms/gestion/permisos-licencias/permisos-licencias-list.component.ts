import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { EstadoPermisoLicencia, PermisoLicencia } from '../../../model/permiso-licencia';
import { EmpleadoService } from '../../../service/empleado.service';
import { PermisoLicenciaService } from '../../../service/permiso-licencia.service';
import { TipoPermisoService } from '../../../service/tipo-permiso.service';
import { PermisosAprobacionDialogComponent } from './permisos-aprobacion-dialog.component';
import { PermisosLicenciasFormComponent } from './permisos-licencias-form.component';

@Component({
  selector: 'app-permisos-licencias-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, DatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './permisos-licencias-list.component.html',
  styleUrls: ['./permisos-licencias-list.component.scss'],
})
export class PermisosLicenciasListComponent implements OnInit {
  titulo = signal<string>('Gestión de Personal · Permisos y Licencias');
  columns = signal<string[]>([
    'codigo',
    'identificacion',
    'empleado',
    'tipoPermiso',
    'modalidad',
    'fechaInicio',
    'fechaFin',
    'diasHoras',
    'conGoce',
    'estado',
    'fechaAprobacion',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  // Filtros
  filtroIdentificacion = signal<string>('');
  filtroTipoPermiso = signal<number | null>(null);
  filtroEstado = signal<number | null>(null);
  filtroConGoce = signal<boolean | null>(null);
  filtroFechaInicio = signal<Date | null>(null);
  filtroFechaFin = signal<Date | null>(null);
  filtroTodasAcciones = signal<boolean>(false);
  orderBy = signal<string>('fechaRegistro');
  orderDir = signal<'ASC' | 'DESC'>('DESC');

  // Opciones para combos
  estadoOptions = [
    { value: 1, label: 'Pendiente', color: 'warn' },
    { value: 2, label: 'Aprobado', color: 'primary' },
    { value: 3, label: 'Rechazado', color: 'accent' },
    { value: 4, label: 'Cancelado', color: 'basic' },
  ];

  goceOptions = [
    { value: true, label: 'Con Goce' },
    { value: false, label: 'Sin Goce' },
  ];

  tiposPermiso = signal<any[]>([]);

  // Datos y paginación
  allData = signal<PermisoLicencia[]>([]);
  pageSize = signal<number>(20);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  constructor(
    private permisoLicenciaService: PermisoLicenciaService,
    private empleadoService: EmpleadoService,
    private tipoPermisoService: TipoPermisoService,
  ) {}

  ngOnInit(): void {
    this.cargarTiposPermiso();
    this.buscar();
  }

  cargarTiposPermiso(): void {
    // Cargar tipos de permiso activos usando selectByCriteria
    const criteriosTP: DatosBusqueda[] = [];
    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'estado',
      'A',
      TipoComandosBusqueda.IGUAL,
    );
    criteriosTP.push(dbEstado);

    this.tipoPermisoService.selectByCriteria({ criterios: criteriosTP }).subscribe({
      next: (tipos) => {
        this.tiposPermiso.set(tipos || []);
      },
      error: () => {
        this.tiposPermiso.set([]);
      },
    });
  }

  buscar(): void {
    this.loading.set(true);
    const criteriosConstruidos = this.buildCriteria();

    this.permisoLicenciaService.selectByCriteria(criteriosConstruidos.criterios).subscribe({
      next: (rows: PermisoLicencia[] | null) => {
        const items = this.extractRows(rows);
        this.allData.set(items);
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al cargar permisos y licencias');
        this.loading.set(false);
      },
    });
  }

  buildCriteria(): any {
    const criterios: DatosBusqueda[] = [];

    // Filtro por identificación del empleado
    if (this.filtroIdentificacion().trim()) {
      const dbIdentificacion = new DatosBusqueda();
      dbIdentificacion.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'empleado.identificacion',
        this.filtroIdentificacion().trim(),
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(dbIdentificacion);
    }

    // Filtro por tipo de permiso
    if (this.filtroTipoPermiso() !== null) {
      const dbTipoPermiso = new DatosBusqueda();
      dbTipoPermiso.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.INTEGER,
        'tipoPermiso.codigo',
        this.filtroTipoPermiso()!.toString(),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(dbTipoPermiso);
    }

    // Filtro por estado
    if (this.filtroEstado() !== null) {
      const dbEstado = new DatosBusqueda();
      dbEstado.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.INTEGER,
        'estado',
        this.filtroEstado()!.toString(),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(dbEstado);
    }

    // Filtro por goce
    if (this.filtroConGoce() !== null) {
      const dbConGoce = new DatosBusqueda();
      dbConGoce.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'conGoce',
        this.filtroConGoce() ? 'true' : 'false',
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(dbConGoce);
    }

    // Filtro por rango de fecha inicio
    if (this.filtroFechaInicio()) {
      const dbFechaInicio = new DatosBusqueda();
      dbFechaInicio.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE,
        'fechaInicio',
        this.filtroFechaInicio()!.toISOString().split('T')[0],
        TipoComandosBusqueda.MAYOR_IGUAL,
      );
      criterios.push(dbFechaInicio);
    }

    if (this.filtroFechaFin()) {
      const dbFechaFin = new DatosBusqueda();
      dbFechaFin.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE,
        'fechaInicio',
        this.filtroFechaFin()!.toISOString().split('T')[0],
        TipoComandosBusqueda.MENOR_IGUAL,
      );
      criterios.push(dbFechaFin);
    }

    return {
      criterios,
      orderBy: this.orderBy(),
      orderDir: this.orderDir(),
    };
  }

  limpiarFiltros(): void {
    this.filtroIdentificacion.set('');
    this.filtroTipoPermiso.set(null);
    this.filtroEstado.set(null);
    this.filtroConGoce.set(null);
    this.filtroFechaInicio.set(null);
    this.filtroFechaFin.set(null);
    this.orderBy.set('fechaRegistro');
    this.orderDir.set('DESC');
    this.buscar();
  }

  onNuevo(): void {
    this.openForm('new');
  }

  onEditar(row: PermisoLicencia): void {
    if (row.estado !== EstadoPermisoLicencia.PENDIENTE) {
      this.showError('Solo se pueden editar permisos en estado Pendiente');
      return;
    }
    this.openForm('edit', row);
  }

  onVer(row: PermisoLicencia): void {
    this.openForm('view', row);
  }

  onAprobar(row: PermisoLicencia): void {
    if (row.estado !== EstadoPermisoLicencia.PENDIENTE) {
      this.showError('Solo se pueden aprobar permisos en estado Pendiente');
      return;
    }
    this.openApprovalDialog(row, 'aprobar');
  }

  onRechazar(row: PermisoLicencia): void {
    if (row.estado !== EstadoPermisoLicencia.PENDIENTE) {
      this.showError('Solo se pueden rechazar permisos en estado Pendiente');
      return;
    }
    this.openApprovalDialog(row, 'rechazar');
  }

  onCancelar(row: PermisoLicencia): void {
    if (
      row.estado !== EstadoPermisoLicencia.PENDIENTE &&
      row.estado !== EstadoPermisoLicencia.APROBADO
    ) {
      this.showError('Solo se pueden cancelar permisos Pendientes o Aprobados');
      return;
    }
    this.openApprovalDialog(row, 'cancelar');
  }

  openForm(mode: 'new' | 'edit' | 'view', data?: PermisoLicencia): void {
    const dialogRef = this.dialog.open(PermisosLicenciasFormComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { mode, data },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.buscar();
      }
    });
  }

  openApprovalDialog(row: PermisoLicencia, action: 'aprobar' | 'rechazar' | 'cancelar'): void {
    const dialogRef = this.dialog.open(PermisosAprobacionDialogComponent, {
      width: '500px',
      data: { permiso: row, action },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.buscar();
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  getEstadoColor(estado: number): string {
    const opcEstado = this.estadoOptions.find((opt) => opt.value === estado);
    return opcEstado?.color || 'basic';
  }

  getEstadoLabel(estado: number): string {
    const opcEstado = this.estadoOptions.find((opt) => opt.value === estado);
    return opcEstado?.label || 'Desconocido';
  }

  formatDiasHoras(row: PermisoLicencia): string {
    if (row.tipoPermiso?.modalidad === 'D') {
      return `${row.dias || 0} días`;
    } else if (row.tipoPermiso?.modalidad === 'H') {
      return `${row.horas || 0} horas`;
    }
    return '-';
  }

  canEdit(row: PermisoLicencia): boolean {
    return row.estado === EstadoPermisoLicencia.PENDIENTE;
  }

  canApprove(row: PermisoLicencia): boolean {
    return row.estado === EstadoPermisoLicencia.PENDIENTE;
  }

  canCancel(row: PermisoLicencia): boolean {
    return (
      row.estado === EstadoPermisoLicencia.PENDIENTE ||
      row.estado === EstadoPermisoLicencia.APROBADO
    );
  }

  // Utilidades para manejo de datos y errores
  private extractRows(response: PermisoLicencia[] | null): PermisoLicencia[] {
    return Array.isArray(response) ? response : [];
  }

  private extractError(error: any): string | null {
    if (typeof error === 'string') {
      return error;
    }
    if (error?.message) {
      return error.message;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    return null;
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }
}
