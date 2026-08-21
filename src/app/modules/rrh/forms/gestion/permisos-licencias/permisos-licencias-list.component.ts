import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { PermisoLicencia } from '../../../model/permiso-licencia';
import { EmpleadoService } from '../../../service/empleado.service';
import { PermisoLicenciaService } from '../../../service/permiso-licencia.service';
import { CatalogoService } from '../../../service/catalogo.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { PermisosAprobacionDialogComponent } from './permisos-aprobacion-dialog.component';
import { PermisosLicenciasFormComponent } from './permisos-licencias-form.component';

@Component({
  selector: 'app-permisos-licencias-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, DatePipe],
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
    'fechaInicio',
    'fechaFin',
    'diasHoras',
    'conGoce',
    'estado',
    'usuarioAprobacion',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private funcionesDatosS = inject(FuncionesDatosService);

  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;

  private _rawFechaInicio = '';
  private _rawFechaFin = '';

  // Filtros
  filtroIdentificacion = signal<string>('');
  filtroTipoPermiso = signal<number | null>(null);
  filtroEstado = signal<string | null>(null); // Cambiar a string para coincidir con backend
  filtroFechaInicioControl = new UntypedFormControl(null);
  filtroFechaFinControl = new UntypedFormControl(null);
  filtroTodasAcciones = signal<boolean>(false);
  orderBy = signal<string>('fechaRegistro');
  orderDir = signal<'ASC' | 'DESC'>('DESC');

  // Opciones para combos (usar strings como el backend)
  estadoOptions = [
    { value: 'SOLICITADA', label: 'Pendiente', color: 'warn' },
    { value: 'APROBADA', label: 'Aprobado', color: 'primary' },
    { value: 'RECHAZADA', label: 'Rechazado', color: 'accent' },
    { value: 'ANULADA', label: 'Cancelado', color: 'basic' },
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
    private catalogoService: CatalogoService,
  ) {}

  ngOnInit(): void {
    this.cargarTiposPermiso();
    this.buscar();
  }

  cargarTiposPermiso(): void {
    // Tipos de permiso activos de la empresa; RHH.CTLG lleva PJRQCDGO desde el script 05
    const criteriosTP: DatosBusqueda[] = criteriosPorEmpresa('nombre');
    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'estado',
      'A',
      TipoComandosBusqueda.IGUAL,
    );
    criteriosTP.push(dbEstado);

    this.catalogoService.selectByCriteria(criteriosTP).subscribe({
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
        TipoDatosBusqueda.LONG,
        'catalogo.codigo',
        this.filtroTipoPermiso()!.toString(),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(dbTipoPermiso);
    }

    // Filtro por estado
    if (this.filtroEstado() !== null) {
      const dbEstado = new DatosBusqueda();
      dbEstado.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'estado',
        this.filtroEstado()!.toString(),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(dbEstado);
    }

    // El goce de sueldo es atributo del tipo (RHH.CTLG), no de la solicitud: se filtra por tipo

    // Filtro por rango de fecha inicio
    const fechaInicioFiltro: Date | null = this.filtroFechaInicioControl.value;
    const fechaFinFiltro: Date | null = this.filtroFechaFinControl.value;

    if (fechaInicioFiltro) {
      const dbFechaInicio = new DatosBusqueda();
      dbFechaInicio.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE,
        'fechaDesde',
        this.toISODate(fechaInicioFiltro),
        TipoComandosBusqueda.MAYOR_IGUAL,
      );
      criterios.push(dbFechaInicio);
    }

    if (fechaFinFiltro) {
      const dbFechaFin = new DatosBusqueda();
      dbFechaFin.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE,
        'fechaDesde',
        this.toISODate(fechaFinFiltro),
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
    this.filtroFechaInicioControl.setValue(null, { emitEvent: false });
    this.filtroFechaFinControl.setValue(null, { emitEvent: false });
    setTimeout(() => {
      if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = '';
      if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = '';
    });
    this.orderBy.set('fechaRegistro');
    this.orderDir.set('DESC');
    this.buscar();
  }

  private toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }

  syncFechaInicioFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.filtroFechaInicioControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaInicioPickerChange(date: Date | null | undefined): void {
    this.filtroFechaInicioControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaFinRaw(event: Event): void {
    this._rawFechaFin = (event.target as HTMLInputElement).value;
  }

  syncFechaFinFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaFin || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaFin = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.filtroFechaFinControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaFinPickerChange(date: Date | null | undefined): void {
    this.filtroFechaFinControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
    });
  }

  onNuevo(): void {
    this.openForm('new');
  }

  onEditar(row: PermisoLicencia): void {
    if (row.estado?.toString().toUpperCase() !== 'SOLICITADA') {
      this.showError('Solo se pueden editar permisos en estado Pendiente');
      return;
    }
    this.openForm('edit', row);
  }

  onVer(row: PermisoLicencia): void {
    this.openForm('view', row);
  }

  onAprobar(row: PermisoLicencia): void {
    if (row.estado?.toString().toUpperCase() !== 'SOLICITADA') {
      this.showError('Solo se pueden aprobar permisos en estado Pendiente');
      return;
    }
    this.openApprovalDialog(row, 'aprobar');
  }

  onRechazar(row: PermisoLicencia): void {
    if (row.estado?.toString().toUpperCase() !== 'SOLICITADA') {
      this.showError('Solo se pueden rechazar permisos en estado Pendiente');
      return;
    }
    this.openApprovalDialog(row, 'rechazar');
  }

  onCancelar(row: PermisoLicencia): void {
    const estadoUpper = row.estado?.toString().toUpperCase();
    if (estadoUpper !== 'SOLICITADA' && estadoUpper !== 'APROBADA') {
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

  getEstadoColor(estado: string | number): string {
    const estadoUpper = estado?.toString().toUpperCase();
    const opcEstado = this.estadoOptions.find((opt) => opt.value === estadoUpper);
    return opcEstado?.color || 'basic';
  }

  getEstadoLabel(estado: string | number): string {
    const estadoUpper = estado?.toString().toUpperCase();
    const opcEstado = this.estadoOptions.find((opt) => opt.value === estadoUpper);
    return opcEstado?.label || 'Desconocido';
  }

  formatDiasHoras(row: PermisoLicencia): string {
    if (row.horas) {
      return `${row.horas} horas`;
    }
    const dias = this.calcularDias(row);
    return dias !== null ? `${dias} días` : '-';
  }

  /** RHH.PTCN no guarda los días: se derivan del rango de fechas. */
  private calcularDias(row: PermisoLicencia): number | null {
    if (!row.fechaInicio || !row.fechaFin) return null;
    const inicio = new Date(row.fechaInicio).getTime();
    const fin = new Date(row.fechaFin).getTime();
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
    return dias > 0 ? dias : null;
  }

  canEdit(row: PermisoLicencia): boolean {
    return row.estado?.toString().toUpperCase() === 'SOLICITADA';
  }

  canApprove(row: PermisoLicencia): boolean {
    return row.estado?.toString().toUpperCase() === 'SOLICITADA';
  }

  canCancel(row: PermisoLicencia): boolean {
    const estadoUpper = row.estado?.toString().toUpperCase();
    return estadoUpper === 'SOLICITADA' || estadoUpper === 'APROBADA';
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
