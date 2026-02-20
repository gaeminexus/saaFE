import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Empleado } from '../../../model/empleado';
import { SaldoVacaciones } from '../../../model/saldo-vacaciones';
import { SolicitudVacaciones } from '../../../model/solicitud-vacaciones';
import { EmpleadoService } from '../../../service/empleado.service';
import { SaldoVacacionesService } from '../../../service/saldo-vacaciones.service';
import { SolicitudVacacionesService } from '../../../service/solicitud-vacaciones.service';
import { VacacionesAprobacionDialogComponent } from './vacaciones-aprobacion-dialog.component';
import { VacacionesFormComponent } from './vacaciones-form.component';

@Component({
  selector: 'app-vacaciones-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './vacaciones-list.component.html',
  styleUrls: ['./vacaciones-list.component.scss'],
})
export class VacacionesListComponent implements OnInit {
  titulo = signal<string>('Gestion · Vacaciones');
  columns = signal<string[]>([
    'codigo',
    'identificacion',
    'empleado',
    'fechaInicio',
    'fechaFin',
    'diasSolicitados',
    'estado',
    'fechaAprobacion',
    'aprobador',
    'fechaRegistro',
    'usuarioRegistro',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  filtroIdentificacion = signal<string>('');
  filtroEmpleadoCodigo = signal<string>('');
  filtroEstado = signal<string | null>('SOLICITADA');
  filtroInicioDesde = signal<string>('');
  filtroInicioHasta = signal<string>('');
  filtroFinDesde = signal<string>('');
  filtroFinHasta = signal<string>('');
  filtroAnio = signal<string>('');
  filtroAprobador = signal<string>('');
  orderBy = signal<string>('fechaInicio');
  orderDir = signal<'ASC' | 'DESC'>('DESC');

  estadoOptions = [
    { value: 'SOLICITADA', label: 'Solicitada' },
    { value: 'APROBADA', label: 'Aprobada' },
    { value: 'RECHAZADA', label: 'Rechazada' },
    { value: 'ANULADA', label: 'Anulada' },
  ];

  allData = signal<SolicitudVacaciones[]>([]);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  saldoEmpleadoBusqueda = signal<string>('');
  saldoEmpleado = signal<Empleado | null>(null);
  saldoAnio = signal<number>(new Date().getFullYear());
  saldoData = signal<SaldoVacaciones[]>([]);
  saldoLoading = signal<boolean>(false);
  saldoError = signal<string>('');

  constructor(
    private solicitudService: SolicitudVacacionesService,
    private empleadoService: EmpleadoService,
    private saldoService: SaldoVacacionesService,
  ) {}

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.loading.set(true);
    const criterios = this.buildCriteria();
    this.solicitudService.selectByCriteria(criterios).subscribe({
      next: (rows: SolicitudVacaciones[] | null) => {
        const items = this.extractRows(rows);
        this.allData.set(this.applyLocalSort(items));
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al cargar solicitudes');
        this.loading.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroIdentificacion.set('');
    this.filtroEmpleadoCodigo.set('');
    this.filtroEstado.set('SOLICITADA');
    this.filtroInicioDesde.set('');
    this.filtroInicioHasta.set('');
    this.filtroFinDesde.set('');
    this.filtroFinHasta.set('');
    this.filtroAnio.set('');
    this.filtroAprobador.set('');
    this.orderBy.set('fechaInicio');
    this.orderDir.set('DESC');
    this.buscar();
  }

  onNuevo(): void {
    const dialogRef = this.dialog.open(VacacionesFormComponent, {
      width: '900px',
      disableClose: true,
      data: { mode: 'new', item: null },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.buscar();
    });
  }

  onVer(row: SolicitudVacaciones): void {
    this.dialog.open(VacacionesFormComponent, {
      width: '900px',
      disableClose: true,
      data: { mode: 'view', item: row },
    });
  }

  onEditar(row: SolicitudVacaciones): void {
    if (!this.isPendiente(row?.estado)) {
      this.showError('Solo se puede editar solicitudes pendientes');
      return;
    }

    const dialogRef = this.dialog.open(VacacionesFormComponent, {
      width: '900px',
      disableClose: true,
      data: { mode: 'edit', item: row },
    });

    dialogRef.afterClosed().subscribe((saved) => {
      if (saved) this.buscar();
    });
  }

  onAprobar(row: SolicitudVacaciones): void {
    if (!this.isPendiente(row?.estado)) {
      this.showError('Solo se puede aprobar solicitudes pendientes');
      return;
    }

    this.openAprobacionDialog('approve', row);
  }

  onRechazar(row: SolicitudVacaciones): void {
    if (!this.isPendiente(row?.estado)) {
      this.showError('Solo se puede rechazar solicitudes pendientes');
      return;
    }

    this.openAprobacionDialog('reject', row);
  }

  onCancelar(row: SolicitudVacaciones): void {
    if (!this.canCancelar(row?.estado)) {
      this.showError('Solo se puede cancelar solicitudes pendientes o aprobadas');
      return;
    }

    this.openAprobacionDialog('cancel', row);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  estadoLabel(value?: string | null): string {
    const normalized = (value ?? '').toString().toUpperCase();
    if (normalized === 'SOLICITADA') return 'Solicitada';
    if (normalized === 'APROBADA') return 'Aprobada';
    if (normalized === 'RECHAZADA') return 'Rechazada';
    if (normalized === 'ANULADA') return 'Anulada';
    return normalized;
  }

  fechaAprobacionLabel(row: SolicitudVacaciones): string {
    const value = (row as any)?.fechaAprobacion as string | Date | null | undefined;
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  empleadoNombre(row: SolicitudVacaciones): string {
    const apellidos = row?.empleado?.apellidos ?? '';
    const nombres = row?.empleado?.nombres ?? '';
    return `${apellidos} ${nombres}`.replace(/\s+/g, ' ').trim();
  }

  saldoEmpleadoLabel(value: Empleado | null): string {
    if (!value) return '-';
    const apellidos = value?.apellidos ?? '';
    const nombres = value?.nombres ?? '';
    return `${apellidos} ${nombres}`.replace(/\s+/g, ' ').trim();
  }

  formatIdentificacion(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const candidate = obj['codigo'] ?? obj['nombre'] ?? obj['valor'] ?? obj['descripcion'];
      if (candidate !== undefined && candidate !== null) return String(candidate);
    }
    return String(value);
  }

  buscarSaldoEmpleado(): void {
    const busqueda = this.saldoEmpleadoBusqueda().trim();
    if (!busqueda) {
      this.saldoError.set('Ingrese una identificacion para buscar');
      this.saldoData.set([]);
      this.saldoEmpleado.set(null);
      return;
    }

    this.saldoLoading.set(true);
    this.saldoError.set('');

    const criterios = this.buildEmpleadoCriteria(busqueda);
    this.empleadoService.selectByCriteria(criterios).subscribe({
      next: (rows: Empleado[] | null) => {
        const items = this.extractRows(rows);
        const first = items[0] ?? null;
        this.saldoEmpleado.set(first);
        if (!first) {
          this.saldoError.set('No se encontraron empleados');
          this.saldoData.set([]);
          this.saldoLoading.set(false);
          return;
        }
        this.loadSaldo(first.codigo, this.saldoAnio());
      },
      error: (err) => {
        this.saldoError.set(this.extractError(err) || 'Error al buscar empleado');
        this.saldoData.set([]);
        this.saldoLoading.set(false);
      },
    });
  }

  onSaldoAnioChange(value: string): void {
    const year = Number(value);
    if (!Number.isFinite(year)) return;
    this.saldoAnio.set(year);
    const empleado = this.saldoEmpleado();
    if (empleado?.codigo) {
      this.loadSaldo(empleado.codigo, year);
    }
  }

  private loadSaldo(empleadoCodigo: number, anio: number): void {
    this.saldoLoading.set(true);
    const criterios: DatosBusqueda[] = [];

    const dbEmpleado = new DatosBusqueda();
    dbEmpleado.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      String(empleadoCodigo),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEmpleado);

    const dbAnio = new DatosBusqueda();
    dbAnio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'anio',
      String(anio),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbAnio);

    const order = new DatosBusqueda();
    order.orderBy('anio');
    order.setTipoOrden(DatosBusqueda.ORDER_DESC);
    criterios.push(order);

    this.saldoService.selectByCriteria(criterios).subscribe({
      next: (rows: SaldoVacaciones[] | null) => {
        this.saldoData.set(this.extractRows(rows));
        this.saldoLoading.set(false);
      },
      error: (err) => {
        this.saldoError.set(this.extractError(err) || 'Error al cargar saldo');
        this.saldoData.set([]);
        this.saldoLoading.set(false);
      },
    });
  }

  private openAprobacionDialog(
    action: 'approve' | 'reject' | 'cancel',
    row: SolicitudVacaciones,
  ): void {
    const dialogRef = this.dialog.open(VacacionesAprobacionDialogComponent, {
      width: '520px',
      disableClose: true,
      data: { action, item: row },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.actualizarEstado(row, result.action, result.observacion ?? null);
    });
  }

  private actualizarEstado(
    row: SolicitudVacaciones,
    action: 'approve' | 'reject' | 'cancel',
    observacion: string | null,
  ): void {
    const estado =
      action === 'approve' ? 'APROBADA' : action === 'reject' ? 'RECHAZADA' : 'ANULADA';
    const payload: Partial<SolicitudVacaciones> = {
      codigo: row.codigo,
      empleado: { codigo: row.empleado?.codigo } as Empleado,
      fechaDesde: row.fechaDesde,
      fechaHasta: row.fechaHasta,
      diasSolicitados: row.diasSolicitados,
      estado,
      observacion: observacion ?? row.observacion ?? undefined,
      usuarioAprobacion: this.getUsuarioRegistro(),
      fechaRegistro: row.fechaRegistro,
      usuarioRegistro: row.usuarioRegistro,
    };

    this.loading.set(true);
    this.solicitudService.update(payload).subscribe({
      next: () => {
        this.showSuccess('Solicitud actualizada');
        this.buscar();
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'No se pudo actualizar');
        this.loading.set(false);
      },
    });
  }

  private buildCriteria(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];

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

    const empleadoCodigo = this.normalizeText(this.filtroEmpleadoCodigo());
    if (empleadoCodigo) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'empleado',
        'codigo',
        empleadoCodigo,
        TipoComandosBusqueda.IGUAL,
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

    const aprobador = this.normalizeText(this.filtroAprobador());
    if (aprobador) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'usuarioAprobacion',
        aprobador,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);
    }

    this.pushDateCriteria(
      criterios,
      'fechaDesde',
      this.filtroInicioDesde(),
      this.filtroInicioHasta(),
    );
    this.pushDateCriteria(criterios, 'fechaHasta', this.filtroFinDesde(), this.filtroFinHasta());

    const anio = Number(this.filtroAnio());
    if (Number.isFinite(anio) && anio > 1900) {
      const from = `${anio}-01-01`;
      const to = `${anio}-12-31`;
      const db = new DatosBusqueda();
      db.asignaUnCampoConBetween(
        'fechaDesde',
        TipoDatosBusqueda.DATE,
        from,
        TipoComandosBusqueda.BETWEEN,
        to,
      );
      criterios.push(db);
    }

    const order = new DatosBusqueda();
    order.orderBy(this.getOrderField(this.orderBy()));
    order.setTipoOrden(
      this.orderDir() === 'ASC' ? DatosBusqueda.ORDER_ASC : DatosBusqueda.ORDER_DESC,
    );
    criterios.push(order);

    return criterios;
  }

  private buildEmpleadoCriteria(busqueda: string): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];
    const texto = this.normalizeText(busqueda);
    if (texto) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'identificacion',
        texto,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);
    }

    const order = new DatosBusqueda();
    order.orderBy('apellidos');
    order.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(order);

    return criterios;
  }

  private pushDateCriteria(
    criterios: DatosBusqueda[],
    field: string,
    desde: string,
    hasta: string,
  ): void {
    if (desde && hasta) {
      const db = new DatosBusqueda();
      db.asignaUnCampoConBetween(
        field,
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
        field,
        desde,
        TipoComandosBusqueda.MAYOR_IGUAL,
      );
      criterios.push(db);
    } else if (hasta) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE,
        field,
        hasta,
        TipoComandosBusqueda.MENOR_IGUAL,
      );
      criterios.push(db);
    }
  }

  private applyLocalSort(rows: SolicitudVacaciones[]): SolicitudVacaciones[] {
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

  private getSortValue(row: SolicitudVacaciones, field: string): string | number {
    switch (field) {
      case 'codigo':
        return row?.codigo ?? 0;
      case 'identificacion':
        return this.normalizeText(this.formatIdentificacion(row?.empleado?.identificacion));
      case 'empleado':
        return this.normalizeText(this.empleadoNombre(row));
      case 'fechaInicio':
        return this.toDateValue(row?.fechaDesde);
      case 'fechaFin':
        return this.toDateValue(row?.fechaHasta);
      case 'diasSolicitados':
        return row?.diasSolicitados ?? 0;
      case 'estado':
        return this.normalizeText(String(row?.estado ?? ''));
      case 'fechaAprobacion':
        return this.toDateValue((row as any)?.fechaAprobacion);
      case 'aprobador':
        return this.normalizeText(String(row?.usuarioAprobacion ?? ''));
      case 'fechaRegistro':
        return this.toDateValue(row?.fechaRegistro);
      case 'usuarioRegistro':
        return this.normalizeText(String(row?.usuarioRegistro ?? ''));
      default:
        return row?.codigo ?? 0;
    }
  }

  private toDateValue(value: string | Date | null | undefined): number {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 0;
    return date.getTime();
  }

  private getOrderField(value: string): string {
    switch (value) {
      case 'fechaInicio':
        return 'fechaDesde';
      case 'fechaFin':
        return 'fechaHasta';
      case 'aprobador':
        return 'usuarioAprobacion';
      default:
        return value;
    }
  }

  private isPendiente(value?: string | null): boolean {
    return (value ?? '').toString().toUpperCase() === 'SOLICITADA';
  }

  private canCancelar(value?: string | null): boolean {
    const normalized = (value ?? '').toString().toUpperCase();
    return normalized === 'SOLICITADA' || normalized === 'APROBADA';
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private extractRows<T>(rows: T[] | null): T[] {
    if (Array.isArray(rows)) return rows;
    if (!rows) return [];
    const wrapped = rows as unknown as { data?: T[]; rows?: T[]; contenido?: T[] };
    if (Array.isArray(wrapped.data)) return wrapped.data;
    if (Array.isArray(wrapped.rows)) return wrapped.rows;
    if (Array.isArray(wrapped.contenido)) return wrapped.contenido;
    return [];
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
}
