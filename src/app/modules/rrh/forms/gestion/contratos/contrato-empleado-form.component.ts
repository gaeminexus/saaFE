import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, ElementRef, Inject, OnInit, signal, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of, switchMap } from 'rxjs';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { ContratoEmpleado } from '../../../model/contrato-empleado';
import { Empleado } from '../../../model/empleado';
import { TipoContratoEmpleado } from '../../../model/tipo-contrato-empleado';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { TipoContratoEmpleadoService } from '../../../service/tipo-contrato-empleado.service';

export interface ContratoEmpleadoFormData {
  mode: 'new' | 'edit';
  item?: ContratoEmpleado | null;
}

@Component({
  selector: 'app-contrato-empleado-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './contrato-empleado-form.component.html',
  styleUrls: ['./contrato-empleado-form.component.scss'],
})
export class ContratoEmpleadoFormComponent implements OnInit {
  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFirmaInput', { read: ElementRef }) fechaFirmaInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaInicio = '';
  private _rawFechaFin = '';
  private _rawFechaFirma = '';

  formEmpleadoBusqueda = signal<string>('');
  formEmpleado = signal<Empleado | null>(null);
  formTipoContrato = signal<TipoContratoEmpleado | null>(null);
  formNumero = signal<string>('');
  formFechaInicioControl = new UntypedFormControl(null);
  formFechaFinControl = new UntypedFormControl(null);
  formSalarioBase = signal<string>('');
  formEstado = signal<string>('ACTIVO');
  formFechaFirmaControl = new UntypedFormControl(null);
  formObservacion = signal<string>('');
  formCodigo = signal<string>('');
  formFechaRegistro = signal<string>('');
  formUsuarioRegistro = signal<string>('');

  requiereFechaFin = computed(() =>
    this.isRequiere(this.formTipoContrato()?.requiereFechaFin as unknown),
  );

  /** Solo para mostrar en el campo de solo lectura "Fecha registro" (dd/MM/yyyy). No altera formFechaRegistro. */
  formFechaRegistroDisplay = computed(
    () => this.funcionesDatosS.formatoFecha(this.formFechaRegistro(), FuncionesDatosService.SOLO_FECHA) || '',
  );

  empleados = signal<Empleado[]>([]);
  tiposContrato = signal<TipoContratoEmpleado[]>([]);

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  infoMsg = signal<string>('');

  estadoOptions = [
    { value: 'BORRADOR', label: 'Borrador' },
    { value: 'ACTIVO', label: 'Activo' },
    { value: 'CERRADO', label: 'Cerrado' },
    { value: 'ANULADO', label: 'Anulado' },
  ];

  constructor(
    private dialogRef: MatDialogRef<ContratoEmpleadoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ContratoEmpleadoFormData,
    private contratoService: ContratoEmpleadoService,
    private empleadoService: EmpleadoService,
    private tipoContratoService: TipoContratoEmpleadoService,
    private snackBar: MatSnackBar,
    private funcionesDatosS: FuncionesDatosService,
  ) {}

  ngOnInit(): void {
    this.loadTiposContrato();

    const item = this.data?.item ?? null;
    if (item) {
      this.formEmpleado.set(item.empleado ?? null);
      this.formTipoContrato.set(item.tipoContratoEmpleado ?? null);
      this.formNumero.set(String(item.numero ?? ''));
      this.formFechaInicioControl.setValue(item.fechaInicio ? new Date(item.fechaInicio) : null, { emitEvent: false });
      this.formFechaFinControl.setValue(item.fechaFin ? new Date(item.fechaFin) : null, { emitEvent: false });
      this.formSalarioBase.set(String(item.salarioBase ?? ''));
      this.formEstado.set(this.normalizeEstado(item.estado as string));
      this.formFechaFirmaControl.setValue(item.fechaFirma ? new Date(item.fechaFirma) : null, { emitEvent: false });
      this.formObservacion.set(String(item.observacion ?? ''));
      this.formCodigo.set(String(item.codigo ?? ''));
      this.formFechaRegistro.set(this.formatDate(item.fechaRegistro));
      this.formUsuarioRegistro.set(String(item.usuarioRegistro ?? ''));
      this.syncEditOptions(item.empleado, item.tipoContratoEmpleado);
    }
  }

  compareEmpleado = (a: Empleado | null, b: Empleado | null): boolean =>
    (a?.codigo ?? null) === (b?.codigo ?? null);

  compareTipoContrato = (a: TipoContratoEmpleado | null, b: TipoContratoEmpleado | null): boolean =>
    (a?.codigo ?? null) === (b?.codigo ?? null);

  onCancelar(): void {
    this.dialogRef.close(false);
  }

  onBuscarEmpleados(): void {
    const busqueda = this.formEmpleadoBusqueda().trim();
    if (!busqueda) {
      this.errorMsg.set('Ingrese una identificacion para buscar');
      this.infoMsg.set('');
      this.empleados.set([]);
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.infoMsg.set('');

    const criterios = this.buildEmpleadoCriteria(busqueda);
    this.empleadoService.selectByCriteria(criterios).subscribe({
      next: (rows: Empleado[] | null) => {
        const items = this.extractRows(rows);
        this.empleados.set(items);
        if (!items.length) {
          this.errorMsg.set('No se encontraron empleados con esa identificacion');
          this.infoMsg.set('');
        } else {
          this.infoMsg.set(`Se cargaron ${items.length} empleados`);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al buscar empleados');
        this.infoMsg.set('');
        this.loading.set(false);
      },
    });
  }

  onGuardar(): void {
    const empleado = this.formEmpleado();
    const tipoContrato = this.formTipoContrato();
    const numero = this.normalizeText(this.formNumero());
    const fechaInicio = this.toISODateOrEmpty(this.formFechaInicioControl.value);
    const fechaFin = this.toISODateOrEmpty(this.formFechaFinControl.value);
    const salarioBase = this.parseNumber(this.formSalarioBase());
    const estado = this.normalizeEstado(this.formEstado());
    const fechaFirma = this.toISODateOrEmpty(this.formFechaFirmaControl.value);
    const observacion = this.normalizeText(this.formObservacion()) || undefined;

    if (!empleado) {
      this.errorMsg.set('Empleado es obligatorio');
      return;
    }

    if (!this.isActivo(empleado?.estado)) {
      this.errorMsg.set('El empleado debe estar ACTIVO');
      return;
    }

    if (!tipoContrato) {
      this.errorMsg.set('Tipo de contrato es obligatorio');
      return;
    }

    if (!this.isActivo(tipoContrato?.estado as string)) {
      this.errorMsg.set('El tipo de contrato debe estar ACTIVO');
      return;
    }

    if (!numero) {
      this.errorMsg.set('Numero es obligatorio');
      return;
    }

    if (!fechaInicio) {
      this.errorMsg.set('Fecha inicio es obligatoria');
      return;
    }

    if (this.isFutureDate(fechaInicio)) {
      this.errorMsg.set('Fecha inicio no puede ser futura');
      return;
    }

    if (salarioBase === null || salarioBase <= 0) {
      this.errorMsg.set('Salario base debe ser mayor a 0');
      return;
    }

    if (!estado) {
      this.errorMsg.set('Estado es obligatorio');
      return;
    }

    if (this.requiereFechaFin()) {
      if (!fechaFin) {
        this.errorMsg.set('Fecha fin es obligatoria');
        return;
      }
      if (this.isBefore(fechaFin, fechaInicio)) {
        this.errorMsg.set('Fecha fin debe ser mayor o igual a fecha inicio');
        return;
      }
    } else if (fechaFin && this.isBefore(fechaFin, fechaInicio)) {
      this.errorMsg.set('Fecha fin debe ser mayor o igual a fecha inicio');
      return;
    }

    const current = this.data?.item ?? null;
    const isUpdate = !!current?.codigo && Number(current.codigo) > 0;

    const payload: Partial<ContratoEmpleado> = {
      empleado: { codigo: empleado.codigo } as Empleado,
      tipoContratoEmpleado: { codigo: tipoContrato.codigo } as TipoContratoEmpleado,
      numero,
      fechaInicio: this.toDate(fechaInicio),
      fechaFin: fechaFin ? this.toDate(fechaFin) : undefined,
      salarioBase,
      estado,
      fechaFirma: fechaFirma ? this.toDate(fechaFirma) : undefined,
      observacion,
    };

    // Debug: revisar payload antes de enviar al backend
    console.log('[ContratoEmpleado] payload', payload);

    if (isUpdate) {
      payload.codigo = current!.codigo;
      payload.fechaRegistro = current?.fechaRegistro ?? undefined;
      payload.usuarioRegistro = current?.usuarioRegistro ?? undefined;
    } else {
      payload.fechaRegistro = new Date();
      payload.usuarioRegistro = this.getUsuarioRegistro();
    }

    this.loading.set(true);
    this.errorMsg.set('');

    this.validarContratoEmpleado(empleado.codigo, numero, payload, current?.codigo)
      .pipe(
        switchMap((ok) => {
          if (!ok) {
            this.loading.set(false);
            return of(null);
          }
          return isUpdate
            ? this.contratoService.update(payload)
            : this.contratoService.add(payload);
        }),
      )
      .subscribe({
        next: (res: ContratoEmpleado | null) => {
          if (!res) return;
          this.snackBar.open('Registro guardado', 'Cerrar', {
            duration: 3500,
            panelClass: ['success-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          const errorMessage = this.extractError(err) || 'Error al guardar';
          this.snackBar.open(errorMessage, 'Cerrar', {
            duration: 8000,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
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

  tipoContratoLabel(value: TipoContratoEmpleado | null): string {
    if (!value) return '';
    return `${value.codigo ?? ''} - ${value.nombre ?? ''}`.trim();
  }

  private loadTiposContrato(): void {
    const criterios: DatosBusqueda[] = [];
    const order = new DatosBusqueda();
    order.orderBy('nombre');
    order.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(order);

    this.tipoContratoService.selectByCriteria(criterios).subscribe({
      next: (rows: TipoContratoEmpleado[] | null) => {
        const items = this.extractRows(rows);
        this.tiposContrato.set(items);
        const selected = this.formTipoContrato();
        if (selected && !items.some((i) => i.codigo === selected.codigo)) {
          this.tiposContrato.set([selected, ...items]);
        }
      },
      error: (err) => {
        this.showError(this.extractError(err) || 'Error al cargar tipos de contrato');
      },
    });
  }

  private syncEditOptions(empleado: Empleado, tipoContrato: TipoContratoEmpleado): void {
    if (empleado) {
      this.empleados.set([empleado, ...this.empleados()]);
      this.formEmpleadoBusqueda.set(this.empleadoLabel(empleado));
    }
    if (tipoContrato) {
      this.tiposContrato.set([tipoContrato, ...this.tiposContrato()]);
    }
  }

  private buildEmpleadoCriteria(busqueda: string): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];
    const raw = busqueda.trim();
    if (raw) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'identificacion',
        this.normalizeText(raw),
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

  private validarContratoEmpleado(
    empleadoCodigo: number,
    numero: string,
    payload: Partial<ContratoEmpleado>,
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

    return this.contratoService.selectByCriteria(criterios).pipe(
      map((rows: ContratoEmpleado[] | null) => {
        const items = this.extractRows(rows);
        const otros = items.filter((r) => r.codigo !== currentId);
        if (otros.some((r) => this.normalizeText(r.numero) === numero)) {
          this.errorMsg.set('Numero ya existe para el empleado');
          return false;
        }

        const activoNuevo = this.isActivo(payload.estado as string);
        if (activoNuevo && otros.some((r) => this.isActivo(r?.estado))) {
          this.errorMsg.set('El empleado ya tiene un contrato activo');
          return false;
        }

        const fechaInicio = payload.fechaInicio as Date;
        const fechaFin = payload.fechaFin as Date | undefined;
        if (this.tieneSolapamiento(otros, fechaInicio, fechaFin)) {
          this.errorMsg.set('Existen contratos con fechas que se solapan');
          return false;
        }

        return true;
      }),
      catchError(() => of(true)),
    );
  }

  private tieneSolapamiento(
    items: ContratoEmpleado[],
    inicio: Date,
    fin: Date | undefined,
  ): boolean {
    const inicioValue = inicio ? inicio.getTime() : 0;
    const finValue = fin ? fin.getTime() : Number.POSITIVE_INFINITY;

    return items.some((row) => {
      const rowInicio = this.toDateValue(row?.fechaInicio);
      const rowFin = row?.fechaFin ? this.toDateValue(row?.fechaFin) : Number.POSITIVE_INFINITY;
      if (!rowInicio) return false;
      return inicioValue <= rowFin && rowInicio <= finValue;
    });
  }

  private toISODateOrEmpty(date: Date | null): string {
    if (!date) return '';
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
        this.formFechaInicioControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaInicioPickerChange(date: Date | null | undefined): void {
    this.formFechaInicioControl.setValue(date || null, { emitEvent: false });
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
        this.formFechaFinControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaFinPickerChange(date: Date | null | undefined): void {
    this.formFechaFinControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaFirmaRaw(event: Event): void {
    this._rawFechaFirma = (event.target as HTMLInputElement).value;
  }

  syncFechaFirmaFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaFirma || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaFirma = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.formFechaFirmaControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaFirmaInputRef?.nativeElement) this.fechaFirmaInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaFirmaPickerChange(date: Date | null | undefined): void {
    this.formFechaFirmaControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaFirmaInputRef?.nativeElement) this.fechaFirmaInputRef.nativeElement.value = formatted;
    });
  }

  private isFutureDate(value: string): boolean {
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date.getTime() > today.getTime();
  }

  private isBefore(left: string, right: string): boolean {
    const l = this.toDateValue(left);
    const r = this.toDateValue(right);
    if (!l || !r) return false;
    return l < r;
  }

  private toDate(value: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) return new Date();
    return date;
  }

  private toDateValue(value: string | Date | null | undefined): number {
    if (!value) return 0;
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return 0;
    return date.getTime();
  }

  private parseNumber(value: string): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }

  private normalizeText(value: string | null | undefined): string {
    return ((value ?? '') as string).replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private normalizeEstado(value?: string | number | null): string {
    if (value === null || value === undefined || value === '') return 'BORRADOR';
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
    return 'BORRADOR';
  }

  private isActivo(value?: string | number | null): boolean {
    if (value === null || value === undefined) return false;
    const normalized = value.toString().toUpperCase();
    return normalized === 'ACTIVO' || normalized === '1' || normalized === 'A';
  }

  private isRequiere(value?: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'S' || normalized === 'SI' || normalized === 'TRUE';
  }

  private formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
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
