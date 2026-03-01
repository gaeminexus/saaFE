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
import {
  FuncionesDatosService,
  TipoFormatoFechaBackend,
} from '../../../../../shared/services/funciones-datos.service';
import { Asistencia, TipoRegistroAsistencia } from '../../../model/asistencia';
import { Empleado } from '../../../model/empleado';
import { AsistenciaService } from '../../../service/asistencia.service';
import { EmpleadoService } from '../../../service/empleado.service';

import { AsistenciaDialogData, AsistenciaFormComponent } from './asistencia-form.component';
import { AsistenciaResumenComponent } from './asistencia-resumen.component';

@Component({
  selector: 'app-asistencia-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, DatePipe, AsistenciaResumenComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './asistencia-list.component.html',
  styleUrls: ['./asistencia-list.component.scss'],
})
export class AsistenciaListComponent implements OnInit {
  titulo = signal<string>('Gestión de Personal · Asistencia y Marcaciones');
  columns = signal<string[]>([
    'fecha',
    'identificacion',
    'empleado',
    'horaEntrada',
    'tipoRegistro',
    'observacion',
    'usuarioRegistro',
    'fechaRegistro',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  // Filtros
  filtroIdentificacion = signal<string>('');
  filtroFechaDesde = signal<Date | null>(this.getDefaultFechaDesde());
  filtroFechaHasta = signal<Date | null>(this.getDefaultFechaHasta());
  filtroTipoRegistro = signal<string | null>(null);
  orderBy = signal<string>('fechaHora');
  orderDir = signal<'ASC' | 'DESC'>('DESC');

  // Opciones para combos
  tipoRegistroOptions = [
    { value: TipoRegistroAsistencia.MARCACION, label: 'Marcación' },
    { value: TipoRegistroAsistencia.FALTA, label: 'Falta' },
    { value: TipoRegistroAsistencia.TARDANZA, label: 'Tardanza' },
    { value: TipoRegistroAsistencia.PERMISO, label: 'Permiso' },
    { value: TipoRegistroAsistencia.VACACION, label: 'Vacación' },
    { value: TipoRegistroAsistencia.LICENCIA, label: 'Licencia' },
  ];

  // Datos
  allData = signal<Asistencia[]>([]);
  dataSource = signal<Asistencia[]>([]);
  empleados = signal<Empleado[]>([]);

  // Paginación
  pageSize = signal<number>(20);
  pageIndex = signal<number>(0);
  totalItems = computed(() => this.allData().length);

  // Servicios
  private asistenciaService = inject(AsistenciaService);
  private empleadoService = inject(EmpleadoService);
  private funcionesDatosService = inject(FuncionesDatosService);

  ngOnInit(): void {
    this.cargarEmpleados();
    this.buscar();
  }

  /**
   * Fecha desde por defecto: primer día del mes actual
   */
  private getDefaultFechaDesde(): Date {
    const fecha = new Date();
    fecha.setDate(1);
    fecha.setHours(0, 0, 0, 0);
    return fecha;
  }

  /**
   * Fecha hasta por defecto: hoy
   */
  private getDefaultFechaHasta(): Date {
    const fecha = new Date();
    fecha.setHours(23, 59, 59, 999);
    return fecha;
  }

  private cargarEmpleados(): void {
    this.empleadoService.getAll().subscribe({
      next: (data) => {
        const activos = (data || []).filter((empleado) => {
          const estado = String(empleado.estado ?? '').toUpperCase();
          return estado === '1' || estado === 'A' || estado === 'ACTIVO';
        });
        this.empleados.set(activos);
        console.log('✅ Empleados cargados:', activos.length);
      },
      error: (err) => {
        console.error('❌ Error cargando empleados:', err);
        this.empleados.set([]);
      },
    });
  }

  buscar(): void {
    // Validar rango de fechas obligatorio
    if (!this.filtroFechaDesde() || !this.filtroFechaHasta()) {
      this.showError('El rango de fechas es obligatorio para consultar asistencia');
      return;
    }
    // Se mantiene para compatibilidad/consistencia de criterios actuales
    this.buildCriteria();
    this.loading.set(true);

    this.asistenciaService.getAll().subscribe({
      next: (data) => {
        const filtrados = this.applyLocalFilters(data || []);
        this.allData.set(filtrados);
        this.pageIndex.set(0);
        this.updatePageData();
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al cargar asistencia');
        this.allData.set([]);
        this.dataSource.set([]);
        this.loading.set(false);
      },
    });
  }

  private applyLocalFilters(registros: Asistencia[]): Asistencia[] {
    const desde = new Date(this.filtroFechaDesde() as Date);
    desde.setHours(0, 0, 0, 0);

    const hasta = new Date(this.filtroFechaHasta() as Date);
    hasta.setHours(23, 59, 59, 999);

    const identificacion = this.normalizeText(this.filtroIdentificacion());
    const tipoRegistro = this.filtroTipoRegistro();

    const filtrados = registros.filter((row) => {
      const fecha = this.parseBackendDate(row.fecha);
      if (!fecha) return false;

      if (fecha < desde || fecha > hasta) return false;

      if (identificacion) {
        const idEmpleado = this.normalizeText(String(row.empleado?.identificacion || ''));
        if (!idEmpleado.includes(identificacion)) return false;
      }

      if (tipoRegistro) {
        if ((row.tipoRegistro || '').toUpperCase() !== tipoRegistro.toUpperCase()) return false;
      }

      return true;
    });

    return filtrados.sort((a, b) => {
      const da = this.parseBackendDate(a.fecha)?.getTime() || 0;
      const db = this.parseBackendDate(b.fecha)?.getTime() || 0;
      return this.orderDir() === 'DESC' ? db - da : da - db;
    });
  }

  private parseBackendDate(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (Array.isArray(value)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = value;
      const parsed = new Date(year, (month || 1) - 1, day || 1, hour, minute, second);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().replace(' ', 'T');
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private buildCriteria(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];

    // Filtro por identificación del empleado
    const identificacion = this.normalizeText(this.filtroIdentificacion());
    if (identificacion) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatosBusqueda.STRING,
        'empleado',
        'identificacion',
        identificacion,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);
    }

    // Filtro por rango de fechas (obligatorio)
    if (this.filtroFechaDesde() && this.filtroFechaHasta()) {
      const dbFechaDesde = new DatosBusqueda();
      dbFechaDesde.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE_TIME,
        'fechaHora',
        this.formatDateTime(this.filtroFechaDesde()!, false),
        TipoComandosBusqueda.MAYOR_IGUAL,
      );
      criterios.push(dbFechaDesde);

      const dbFechaHasta = new DatosBusqueda();
      dbFechaHasta.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE_TIME,
        'fechaHora',
        this.formatDateTime(this.filtroFechaHasta()!, true),
        TipoComandosBusqueda.MENOR_IGUAL,
      );
      criterios.push(dbFechaHasta);
    }

    // Filtro por tipo de registro
    const tipoRegistro = this.filtroTipoRegistro();
    if (tipoRegistro) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'tipo',
        tipoRegistro,
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(db);
    }

    // Marcaciones no expone campo "estado" en backend, se omite este filtro

    // Ordenamiento
    const order = new DatosBusqueda();
    order.orderBy(this.orderBy());
    order.setTipoOrden(
      this.orderDir() === 'DESC' ? DatosBusqueda.ORDER_DESC : DatosBusqueda.ORDER_ASC,
    );
    criterios.push(order);

    return criterios;
  }

  private updatePageData(): void {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    this.dataSource.set(this.allData().slice(start, end));
  }

  limpiar(): void {
    this.filtroIdentificacion.set('');
    this.filtroFechaDesde.set(null);
    this.filtroFechaHasta.set(null);
    this.filtroTipoRegistro.set(null);
    this.allData.set([]);
    this.dataSource.set([]);
  }

  onNuevo(): void {
    this.openForm('new');
  }

  onEditar(row: Asistencia): void {
    this.openForm('edit', row);
  }

  onVer(row: Asistencia): void {
    this.openForm('view', row);
  }

  onInactivar(row: Asistencia): void {
    const motivo = prompt('Ingrese el motivo de la inactivación:');
    if (!motivo || !motivo.trim()) {
      return; // Cancelado
    }

    this.loading.set(true);
    this.asistenciaService.inactivar(row.codigo, motivo).subscribe({
      next: () => {
        this.showSuccess('Registro inactivado exitosamente');
        this.buscar();
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al inactivar registro');
        this.loading.set(false);
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updatePageData();
  }

  private openForm(mode: 'new' | 'edit' | 'view', data?: Asistencia): void {
    const dialogRef = this.dialog.open(AsistenciaFormComponent, {
      width: '800px',
      disableClose: true,
      data: { asistencia: data, readonly: mode === 'view' } as AsistenciaDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.buscar();
      }
    });
  }

  // Formateo y utilidades
  formatEmpleado(row: Asistencia): string {
    const apellidos = row.empleado?.apellidos || '';
    const nombres = row.empleado?.nombres || '';
    return `${apellidos} ${nombres}`.trim();
  }

  formatFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return '-';
    const d = this.parseBackendDate(fecha);
    if (!d) return '-';
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  formatFechaHora(fecha: Date | string | null | undefined): string {
    if (!fecha) return '-';
    const d = this.parseBackendDate(fecha);
    if (!d) return '-';
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  getTipoRegistroLabel(tipo: string): string {
    const opt = this.tipoRegistroOptions.find((o) => o.value === tipo);
    return opt?.label || tipo;
  }

  getTipoRegistroColor(tipo: string): string {
    switch (tipo) {
      case TipoRegistroAsistencia.MARCACION:
        return 'primary';
      case TipoRegistroAsistencia.FALTA:
        return 'warn';
      case TipoRegistroAsistencia.TARDANZA:
        return 'accent';
      case TipoRegistroAsistencia.PERMISO:
      case TipoRegistroAsistencia.VACACION:
      case TipoRegistroAsistencia.LICENCIA:
        return 'basic';
      default:
        return 'basic';
    }
  }

  private normalizeText(value: string): string {
    return value?.trim().toUpperCase() || '';
  }

  private formatDateTime(date: Date, endOfDay: boolean): string {
    const dt = new Date(date);
    if (endOfDay) {
      dt.setHours(23, 59, 59, 0);
    } else {
      dt.setHours(0, 0, 0, 0);
    }

    const formatted =
      this.funcionesDatosService.formatearFechaParaBackend(
        dt,
        TipoFormatoFechaBackend.FECHA_HORA,
      ) || '';

    // Backend Marcaciones parsea DATE_TIME con precisión hasta minutos: yyyy-MM-dd HH:mm
    return formatted.length >= 16 ? formatted.substring(0, 16) : formatted;
  }

  private extractError(error: any): string | null {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    return null;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }
}
