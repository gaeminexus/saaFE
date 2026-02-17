import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of, switchMap } from 'rxjs';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { ContratoEmpleado } from '../../../model/contrato-empleado';
import { Empleado } from '../../../model/empleado';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { ContratoEmpleadoFormComponent } from './contrato-empleado-form.component';

@Component({
  selector: 'app-contrato-empleado-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './contrato-empleado-list.component.html',
  styleUrls: ['./contrato-empleado-list.component.scss'],
})
export class ContratoEmpleadoListComponent implements OnInit {
  titulo = signal<string>('Gestion · Contratos de Empleados');
  columns = signal<string[]>([
    'codigo',
    'identificacion',
    'empleado',
    'tipoContrato',
    'numero',
    'fechaInicio',
    'fechaFin',
    'salarioBase',
    'estado',
    'fechaFirma',
    'fechaRegistro',
    'usuarioRegistro',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  filtroIdentificacion = signal<string>('');
  filtroEmpleadoCodigo = signal<string>('');
  filtroTipoContratoCodigo = signal<string>('');
  filtroNumero = signal<string>('');
  filtroEstado = signal<string | null>('ACTIVO');
  filtroInicioDesde = signal<string>('');
  filtroInicioHasta = signal<string>('');
  filtroFinDesde = signal<string>('');
  filtroFinHasta = signal<string>('');
  orderBy = signal<string>('codigo');
  orderDir = signal<'ASC' | 'DESC'>('ASC');

  estadoOptions = [
    { value: 'BORRADOR', label: 'Borrador' },
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'CERRADO', label: 'Cerrado' },
    { value: 'ANULADO', label: 'Anulado' },
  ];

  allData = signal<ContratoEmpleado[]>([]);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  pagedData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.allData().slice(start, end);
  });
  totalItems = computed(() => this.allData().length);

  constructor(
    private contratoService: ContratoEmpleadoService,
    private empleadoService: EmpleadoService,
  ) {}

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.loading.set(true);
    const identificacionRaw = this.filtroIdentificacion().trim();
    const request$ = identificacionRaw
      ? this.fetchEmpleadoCodesByIdentificacion(identificacionRaw).pipe(
          switchMap((codigos) => {
            if (!codigos.length) return of([] as ContratoEmpleado[]);
            return this.contratoService.selectByCriteria(this.buildCriteria(codigos));
          }),
        )
      : this.contratoService.selectByCriteria(this.buildCriteria());

    request$.subscribe({
      next: (rows: ContratoEmpleado[] | null) => {
        const items = this.extractRows(rows);
        const filtered = this.applyLocalFilters(items);
        this.allData.set(this.applyLocalSort(filtered));
        this.pageIndex.set(0);
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al cargar contratos');
        this.loading.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroIdentificacion.set('');
    this.filtroEmpleadoCodigo.set('');
    this.filtroTipoContratoCodigo.set('');
    this.filtroNumero.set('');
    this.filtroEstado.set('ACTIVO');
    this.filtroInicioDesde.set('');
    this.filtroInicioHasta.set('');
    this.filtroFinDesde.set('');
    this.filtroFinHasta.set('');
    this.orderBy.set('codigo');
    this.orderDir.set('ASC');
    this.buscar();
  }

  onNuevo(): void {
    this.openForm('new');
  }

  onEditar(row: ContratoEmpleado): void {
    this.openForm('edit', row);
  }

  onVerContratosEmpleado(row: ContratoEmpleado): void {
    const codigo = row?.empleado?.codigo ? String(row.empleado.codigo) : '';
    const identificacion = this.formatIdentificacion(row?.empleado?.identificacion);
    this.filtroEmpleadoCodigo.set(codigo);
    this.filtroIdentificacion.set(identificacion);
    this.buscar();
  }

  onToggleEstado(row: ContratoEmpleado): void {
    const next = this.isActivo(row?.estado) ? 'ANULADO' : 'ACTIVO';
    const payload: Partial<ContratoEmpleado> = {
      codigo: row.codigo,
      empleado: row.empleado,
      tipoContratoEmpleado: row.tipoContratoEmpleado,
      numero: row.numero,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin ?? undefined,
      salarioBase: row.salarioBase,
      estado: next,
      fechaFirma: row.fechaFirma ?? undefined,
      observacion: row.observacion ?? undefined,
      fechaRegistro: row.fechaRegistro,
      usuarioRegistro: row.usuarioRegistro,
    };

    this.loading.set(true);

    this.validarActivacion(row, next)
      .pipe(
        switchMap((ok) => {
          if (!ok) {
            this.loading.set(false);
            return of(null);
          }
          return this.contratoService.update(payload);
        }),
      )
      .subscribe({
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
    if (value === null || value === undefined) return '';
    const normalized = value.toString().toUpperCase();
    if (['BORRADOR', 'ACTIVO', 'CERRADO', 'ANULADO'].includes(normalized)) {
      return normalized;
    }
    return this.isActivo(value) ? 'ACTIVO' : 'ANULADO';
  }

  empleadoNombre(row: ContratoEmpleado): string {
    const apellidos = row?.empleado?.apellidos ?? '';
    const nombres = row?.empleado?.nombres ?? '';
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

  private validarActivacion(row: ContratoEmpleado, nextEstado: string) {
    if (nextEstado !== 'ACTIVO') return of(true);
    const empleadoId = row?.empleado?.codigo;
    if (!empleadoId) return of(true);

    const criterios: DatosBusqueda[] = [];
    const dbEmpleado = new DatosBusqueda();
    dbEmpleado.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      String(empleadoId),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEmpleado);

    return this.contratoService.selectByCriteria(criterios).pipe(
      map((rows: ContratoEmpleado[] | null) => {
        const items = this.extractRows(rows);
        const activos = items.filter((r) =>
          this.isActivo(r?.estado ? String(r.estado) : undefined),
        );
        const otros = activos.filter((r) => r.codigo !== row.codigo);
        if (otros.length) {
          this.showError('No se puede activar: el empleado ya tiene un contrato activo');
          return false;
        }
        return true;
      }),
      catchError(() => of(true)),
    );
  }

  private buildCriteria(empleadoCodigos?: number[]): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];

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
    } else if (empleadoCodigos && empleadoCodigos.length) {
      empleadoCodigos.forEach((codigo, index) => {
        const db = new DatosBusqueda();
        db.asignaValorConCampoPadre(
          TipoDatosBusqueda.LONG,
          'empleado',
          'codigo',
          String(codigo),
          TipoComandosBusqueda.IGUAL,
        );
        if (index > 0) db.setTipoOperadorLogico(TipoComandosBusqueda.OR);
        criterios.push(db);
      });
    }

    const tipoContratoCodigo = this.normalizeText(this.filtroTipoContratoCodigo());
    if (tipoContratoCodigo) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'tipoContratoEmpleado',
        'codigo',
        tipoContratoCodigo,
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(db);
    }

    const numero = this.normalizeText(this.filtroNumero());
    if (numero) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'numero',
        numero,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);
    }

    const estado = this.filtroEstado();
    if (estado !== null && estado !== '') {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'estado',
        estado,
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(db);
    }

    this.pushDateCriteria(
      criterios,
      'fechaInicio',
      this.filtroInicioDesde(),
      this.filtroInicioHasta(),
    );
    this.pushDateCriteria(criterios, 'fechaFin', this.filtroFinDesde(), this.filtroFinHasta());

    const order = new DatosBusqueda();
    order.orderBy(this.orderBy());
    order.setTipoOrden(
      this.orderDir() === 'ASC' ? DatosBusqueda.ORDER_ASC : DatosBusqueda.ORDER_DESC,
    );
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

  private applyLocalFilters(rows: ContratoEmpleado[]): ContratoEmpleado[] {
    const identificacionRaw = this.filtroIdentificacion().trim();
    const identificacion = this.normalizeText(identificacionRaw);
    const identificacionDigits = this.normalizeDigits(identificacionRaw);
    const empleadoCodigo = this.normalizeText(this.filtroEmpleadoCodigo());
    const tipoContratoCodigo = this.normalizeText(this.filtroTipoContratoCodigo());
    const numero = this.normalizeText(this.filtroNumero());
    const estado = this.filtroEstado();
    const inicioDesde = this.filtroInicioDesde();
    const inicioHasta = this.filtroInicioHasta();
    const finDesde = this.filtroFinDesde();
    const finHasta = this.filtroFinHasta();

    return rows.filter((row) => {
      const rowIdentRaw = this.formatIdentificacion(row?.empleado?.identificacion);
      const rowIdent = this.normalizeText(rowIdentRaw);
      const rowIdentDigits = this.normalizeDigits(rowIdentRaw);
      const rowEmpleadoCodigo = row?.empleado?.codigo ? String(row.empleado.codigo) : '';
      const rowTipoCodigo = row?.tipoContratoEmpleado?.codigo
        ? String(row.tipoContratoEmpleado.codigo)
        : '';
      const rowNumero = this.normalizeText(row?.numero ?? '');

      const identOk = !identificacionRaw
        ? true
        : this.isNumericText(identificacionRaw)
          ? rowIdentDigits.includes(identificacionDigits)
          : rowIdent.includes(identificacion);
      const empleadoOk = !empleadoCodigo ? true : rowEmpleadoCodigo === empleadoCodigo;
      const tipoOk = !tipoContratoCodigo ? true : rowTipoCodigo === tipoContratoCodigo;
      const numeroOk = !numero ? true : rowNumero.includes(numero);

      const estadoOk = !estado ? true : this.normalizeEstado(row?.estado) === estado;

      const inicioOk = this.matchDateRange(row?.fechaInicio, inicioDesde, inicioHasta);
      const finOk = this.matchDateRange(row?.fechaFin, finDesde, finHasta);

      return identOk && empleadoOk && tipoOk && numeroOk && estadoOk && inicioOk && finOk;
    });
  }

  private fetchEmpleadoCodesByIdentificacion(value: string) {
    const criterios: DatosBusqueda[] = [];
    const raw = value.trim();
    const normalized = this.normalizeText(raw);
    if (normalized) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'identificacion',
        raw,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(db);

      const digits = this.normalizeDigits(raw);
      if (digits && digits !== raw) {
        const dbDigits = new DatosBusqueda();
        dbDigits.asignaUnCampoSinTrunc(
          TipoDatosBusqueda.STRING,
          'identificacion',
          digits,
          TipoComandosBusqueda.LIKE,
        );
        dbDigits.setTipoOperadorLogico(TipoComandosBusqueda.OR);
        criterios.push(dbDigits);
      }
    }

    const order = new DatosBusqueda();
    order.orderBy('apellidos');
    order.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(order);

    return this.empleadoService.selectByCriteria(criterios).pipe(
      map((rows: Empleado[] | null) => {
        const items = this.extractRows(rows);
        return items
          .map((row) => row?.codigo)
          .filter((codigo): codigo is number => Number.isFinite(codigo));
      }),
      catchError(() => of([])),
    );
  }

  private applyLocalSort(rows: ContratoEmpleado[]): ContratoEmpleado[] {
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

  private getSortValue(row: ContratoEmpleado, field: string): string | number {
    switch (field) {
      case 'codigo':
        return row?.codigo ?? 0;
      case 'identificacion':
        return this.normalizeText(this.formatIdentificacion(row?.empleado?.identificacion));
      case 'empleado':
        return this.normalizeText(this.empleadoNombre(row));
      case 'tipoContrato':
        return this.normalizeText(String(row?.tipoContratoEmpleado?.nombre ?? ''));
      case 'numero':
        return this.normalizeText(row?.numero ?? '');
      case 'fechaInicio':
        return this.toDateValue(row?.fechaInicio);
      case 'fechaFin':
        return this.toDateValue(row?.fechaFin);
      case 'salarioBase':
        return row?.salarioBase ?? 0;
      case 'estado':
        return this.normalizeText(String(row?.estado ?? ''));
      case 'fechaFirma':
        return this.toDateValue(row?.fechaFirma);
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
    if (isNaN(date.getTime())) return 0;
    return date.getTime();
  }

  private matchDateRange(
    value: string | Date | null | undefined,
    desde: string,
    hasta: string,
  ): boolean {
    if (!desde && !hasta) return true;
    const current = this.toDateValue(value);
    if (!current) return false;
    const start = desde ? this.toDateValue(desde) : null;
    const end = hasta ? this.toDateValue(hasta) : null;
    if (start !== null && current < start) return false;
    if (end !== null && current > end) return false;
    return true;
  }

  isActivo(value?: string | number | null | undefined): boolean {
    if (value === null || value === undefined) return false;
    const normalized = value.toString().toUpperCase();
    return normalized === 'ACTIVO' || normalized === '1' || normalized === 'A';
  }

  private normalizeEstado(value?: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    const normalized = value.toString().toUpperCase();
    if (['BORRADOR', 'ACTIVO', 'CERRADO', 'ANULADO'].includes(normalized)) {
      return normalized;
    }
    if (normalized === '1' || normalized === 'A' || normalized.startsWith('ACT')) {
      return 'ACTIVO';
    }
    if (normalized === '2' || normalized === 'I' || normalized.startsWith('INA')) {
      return 'ANULADO';
    }
    return normalized;
  }

  private normalizeText(value: string | null | undefined): string {
    return ((value ?? '') as string).replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private normalizeDigits(value: string | null | undefined): string {
    return (value ?? '').replace(/\D+/g, '');
  }

  private isNumericText(value: string | null | undefined): boolean {
    if (!value) return false;
    return /^\d+$/.test(value.trim());
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

  private openForm(mode: 'new' | 'edit', row?: ContratoEmpleado): void {
    const dialogRef = this.dialog.open(ContratoEmpleadoFormComponent, {
      width: '780px',
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
