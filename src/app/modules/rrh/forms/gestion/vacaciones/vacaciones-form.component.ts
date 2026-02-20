import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of, switchMap } from 'rxjs';
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

export interface VacacionesFormData {
  mode: 'new' | 'edit' | 'view';
  item?: SolicitudVacaciones | null;
}

@Component({
  selector: 'app-vacaciones-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './vacaciones-form.component.html',
  styleUrls: ['./vacaciones-form.component.scss'],
})
export class VacacionesFormComponent implements OnInit {
  formEmpleadoBusqueda = signal<string>('');
  formEmpleado = signal<Empleado | null>(null);
  formFechaInicio = signal<string>('');
  formFechaFin = signal<string>('');
  formDiasSolicitados = signal<number>(0);
  formObservacion = signal<string>('');
  formCodigo = signal<string>('');
  formEstado = signal<string>('SOLICITADA');
  formFechaRegistro = signal<string>('');
  formUsuarioRegistro = signal<string>('');
  formAprobador = signal<string>('');
  formFechaAprobacion = signal<string>('');

  empleados = signal<Empleado[]>([]);
  saldoData = signal<SaldoVacaciones | null>(null);
  saldoAnio = signal<number>(new Date().getFullYear());

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  isView = computed(() => this.data.mode === 'view');

  constructor(
    private dialogRef: MatDialogRef<VacacionesFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VacacionesFormData,
    private solicitudService: SolicitudVacacionesService,
    private empleadoService: EmpleadoService,
    private saldoService: SaldoVacacionesService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const item = this.data?.item ?? null;
    if (item) {
      this.formEmpleado.set(item.empleado ?? null);
      this.formFechaInicio.set(this.formatDate(item.fechaDesde));
      this.formFechaFin.set(this.formatDate(item.fechaHasta));
      this.formDiasSolicitados.set(item.diasSolicitados ?? 0);
      this.formObservacion.set(String(item.observacion ?? ''));
      this.formCodigo.set(String(item.codigo ?? ''));
      this.formEstado.set(this.normalizeEstado(item.estado as string));
      this.formFechaRegistro.set(this.formatDate(item.fechaRegistro));
      this.formUsuarioRegistro.set(String(item.usuarioRegistro ?? ''));
      this.formAprobador.set(String(item.usuarioAprobacion ?? ''));
      this.formFechaAprobacion.set(this.formatDate((item as any)?.fechaAprobacion));
      this.formEmpleadoBusqueda.set(this.empleadoLabel(item.empleado));
    }

    if (this.formEmpleado()) {
      const year = this.getYearFromDate(this.formFechaInicio());
      this.saldoAnio.set(year);
      this.loadSaldo(this.formEmpleado()!.codigo, year);
    }
  }

  compareEmpleado = (a: Empleado | null, b: Empleado | null): boolean =>
    (a?.codigo ?? null) === (b?.codigo ?? null);

  onCancelar(): void {
    this.dialogRef.close(false);
  }

  onBuscarEmpleados(): void {
    const busqueda = this.formEmpleadoBusqueda().trim();
    if (!busqueda) {
      this.errorMsg.set('Ingrese una identificacion para buscar');
      this.empleados.set([]);
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const criterios = this.buildEmpleadoCriteria(busqueda);
    this.empleadoService.selectByCriteria(criterios).subscribe({
      next: (rows: Empleado[] | null) => {
        this.empleados.set(this.extractRows(rows));
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al buscar empleados');
        this.loading.set(false);
      },
    });
  }

  onEmpleadoChange(empleado: Empleado | null): void {
    this.formEmpleado.set(empleado);
    if (empleado?.codigo) {
      const year = this.getYearFromDate(this.formFechaInicio());
      this.saldoAnio.set(year);
      this.loadSaldo(empleado.codigo, year);
    }
  }

  onFechaInicioChange(value: string): void {
    this.formFechaInicio.set(value);
    this.updateDiasSolicitados();
    const empleado = this.formEmpleado();
    if (empleado?.codigo) {
      const year = this.getYearFromDate(value);
      this.saldoAnio.set(year);
      this.loadSaldo(empleado.codigo, year);
    }
  }

  onFechaFinChange(value: string): void {
    this.formFechaFin.set(value);
    this.updateDiasSolicitados();
  }

  onDiasSolicitadosChange(value: string): void {
    const parsed = Number(value);
    this.formDiasSolicitados.set(Number.isFinite(parsed) ? parsed : 0);
  }

  onGuardar(): void {
    if (this.isView()) {
      this.dialogRef.close(false);
      return;
    }

    const empleado = this.formEmpleado();
    const fechaInicio = this.formFechaInicio();
    const fechaFin = this.formFechaFin();
    const diasSolicitados = this.formDiasSolicitados();
    const observacion = this.formObservacion().trim();

    if (!empleado) {
      this.errorMsg.set('Empleado es obligatorio');
      return;
    }

    if (!this.isEmpleadoActivo(empleado?.estado)) {
      this.errorMsg.set('El empleado debe estar ACTIVO');
      return;
    }

    if (!fechaInicio) {
      this.errorMsg.set('Fecha inicio es obligatoria');
      return;
    }

    if (!fechaFin) {
      this.errorMsg.set('Fecha fin es obligatoria');
      return;
    }

    if (this.isBefore(fechaFin, fechaInicio)) {
      this.errorMsg.set('Fecha fin debe ser mayor o igual a fecha inicio');
      return;
    }

    if (this.isPastDate(fechaInicio) && !observacion) {
      this.errorMsg.set('Solicitud retroactiva requiere observacion');
      return;
    }

    if (!Number.isFinite(diasSolicitados) || diasSolicitados <= 0) {
      this.errorMsg.set('Dias solicitados debe ser mayor a 0');
      return;
    }

    const current = this.data?.item ?? null;
    const isUpdate = !!current?.codigo && Number(current.codigo) > 0;
    const estado = isUpdate ? this.normalizeEstado(current?.estado as string) : 'SOLICITADA';

    const payload: Partial<SolicitudVacaciones> = {
      empleado: { codigo: empleado.codigo } as Empleado,
      fechaDesde: this.toDate(fechaInicio),
      fechaHasta: this.toDate(fechaFin),
      diasSolicitados,
      estado,
      observacion: observacion || undefined,
    };

    if (isUpdate) {
      payload.codigo = current!.codigo;
      payload.fechaRegistro = current?.fechaRegistro ?? undefined;
      payload.usuarioRegistro = current?.usuarioRegistro ?? undefined;
      payload.usuarioAprobacion = current?.usuarioAprobacion ?? undefined;
    } else {
      payload.fechaRegistro = new Date();
      payload.usuarioRegistro = this.getUsuarioRegistro();
    }

    this.loading.set(true);
    this.errorMsg.set('');

    // TODO(test): validacion de saldo deshabilitada temporalmente
    this.validarCruces(empleado.codigo, payload, current?.codigo)
      .pipe(
        switchMap((okCruces) => {
          if (!okCruces) return of(null);
          return isUpdate
            ? this.solicitudService.update(payload)
            : this.solicitudService.add(payload);
        }),
      )
      .subscribe({
        next: (res) => {
          if (!res) return;
          this.snackBar.open('Solicitud guardada', 'Cerrar', {
            duration: 3500,
            panelClass: ['success-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.showError(this.extractError(err) || 'Error al guardar');
          this.loading.set(false);
        },
      });
  }

  empleadoLabel(value: Empleado | null): string {
    if (!value) return '';
    const ident = this.formatIdentificacion(value.identificacion);
    const nombre = `${value.apellidos ?? ''} ${value.nombres ?? ''}`.replace(/\s+/g, ' ').trim();
    return `${ident} - ${nombre}`.trim();
  }

  private updateDiasSolicitados(): void {
    const inicio = this.formFechaInicio();
    const fin = this.formFechaFin();
    if (!inicio || !fin) {
      this.formDiasSolicitados.set(0);
      return;
    }
    const start = this.toDateValue(inicio);
    const end = this.toDateValue(fin);
    if (!start || !end || end < start) {
      this.formDiasSolicitados.set(0);
      return;
    }
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    this.formDiasSolicitados.set(diff);
  }

  private validarSaldo(empleadoCodigo: number, anio: number, diasSolicitados: number) {
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

    return this.saldoService.selectByCriteria(criterios).pipe(
      map((rows: SaldoVacaciones[] | null) => {
        const items = this.extractRows(rows);
        const saldo = items[0] ?? null;
        this.saldoData.set(saldo);
        if (!saldo) {
          this.errorMsg.set('No se encontro saldo para el empleado');
          return false;
        }
        if (saldo.diasPendientes < diasSolicitados) {
          this.errorMsg.set('Dias solicitados exceden el saldo disponible');
          return false;
        }
        return true;
      }),
      catchError(() => {
        this.errorMsg.set('No se pudo validar el saldo');
        return of(false);
      }),
    );
  }

  private validarCruces(
    empleadoCodigo: number,
    payload: Partial<SolicitudVacaciones>,
    currentId?: number | null,
  ) {
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

    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'estado',
      'APROBADA',
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEstado);

    return this.solicitudService.selectByCriteria(criterios).pipe(
      map((rows: SolicitudVacaciones[] | null) => {
        const items = this.extractRows(rows).filter((r) => r.codigo !== currentId);
        const inicio = payload.fechaDesde as Date;
        const fin = payload.fechaHasta as Date;
        const overlap = items.some((row) => this.hasOverlap(row, inicio, fin));
        if (overlap) {
          this.errorMsg.set('Existe una solicitud aprobada que se solapa con las fechas');
          return false;
        }
        return true;
      }),
      catchError(() => of(true)),
    );
  }

  private hasOverlap(row: SolicitudVacaciones, inicio: Date, fin: Date): boolean {
    const rowInicio = this.toDateValue(row?.fechaDesde);
    const rowFin = this.toDateValue(row?.fechaHasta);
    const start = this.toDateValue(inicio);
    const end = this.toDateValue(fin);
    if (!rowInicio || !rowFin || !start || !end) return false;
    return start <= rowFin && rowInicio <= end;
  }

  private loadSaldo(empleadoCodigo: number, anio: number): void {
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

    this.saldoService.selectByCriteria(criterios).subscribe({
      next: (rows: SaldoVacaciones[] | null) => {
        const items = this.extractRows(rows);
        this.saldoData.set(items[0] ?? null);
      },
      error: () => {
        this.saldoData.set(null);
      },
    });
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

  private normalizeEstado(value?: string | number | null): string {
    const normalized = (value ?? '').toString().toUpperCase();
    if (['SOLICITADA', 'APROBADA', 'RECHAZADA', 'ANULADA'].includes(normalized)) {
      return normalized;
    }
    if (normalized === 'P') return 'SOLICITADA';
    if (normalized === 'A') return 'APROBADA';
    if (normalized === 'R') return 'RECHAZADA';
    if (normalized === 'C') return 'ANULADA';
    return 'SOLICITADA';
  }

  private isEmpleadoActivo(value?: string | number | null): boolean {
    if (value === null || value === undefined) return false;
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT');
  }

  private isPastDate(value: string): boolean {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date.getTime() < today.getTime();
  }

  private isBefore(left: string, right: string): boolean {
    const l = this.toDateValue(left);
    const r = this.toDateValue(right);
    if (!l || !r) return false;
    return l < r;
  }

  private toDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return new Date();
    return date;
  }

  private toDateValue(value: string | Date | null | undefined): number {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 0;
    return date.getTime();
  }

  private getYearFromDate(value: string): number {
    if (!value) return new Date().getFullYear();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return new Date().getFullYear();
    return date.getFullYear();
  }

  private formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private formatIdentificacion(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const candidate = obj['codigo'] ?? obj['nombre'] ?? obj['valor'] ?? obj['descripcion'];
      if (candidate !== undefined && candidate !== null) return String(candidate);
    }
    return String(value);
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

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
