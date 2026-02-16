import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { Empleado } from '../../../model/empleado';
import { EmpleadoService } from '../../../service/empleado.service';

export interface EmpleadoFormData {
  mode: 'new' | 'edit';
  item?: Empleado | null;
}

@Component({
  selector: 'app-empleado-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './empleado-form.component.html',
  styleUrls: ['./empleado-form.component.scss'],
})
export class EmpleadoFormComponent implements OnInit {
  formIdentificacion = signal<DetalleRubro | null>(null);
  formNombres = signal<string>('');
  formApellidos = signal<string>('');
  formFechaNacimiento = signal<string>('');
  formTelefono = signal<string>('');
  formEmail = signal<string>('');
  formDireccion = signal<string>('');

  formEstado = signal<string>('A');

  formCodigo = signal<string>('');
  formFechaRegistro = signal<string>('');
  formUsuarioRegistro = signal<string>('');

  identificaciones = signal<DetalleRubro[]>([]);

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  private initialIdentificacion: Empleado['identificacion'] | null = null;

  private readonly RUBRO_TIPO_IDENTIFICACION = 36;

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  constructor(
    private dialogRef: MatDialogRef<EmpleadoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmpleadoFormData,
    private empleadoService: EmpleadoService,
    private detalleRubroService: DetalleRubroService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadCombos();

    const item = this.data?.item ?? null;
    if (item) {
      this.initialIdentificacion = item.identificacion ?? null;
      const rawIdentificacion = (item as any)?.identificacion ?? item.identificacion ?? null;
      const identificacion = this.resolveIdentificacion(rawIdentificacion);
      if (identificacion) {
        this.formIdentificacion.set(identificacion);
      }
      this.formNombres.set(String(item.nombres ?? ''));
      this.formApellidos.set(String(item.apellidos ?? ''));
      this.formFechaNacimiento.set(this.formatDate(item.fechaNacimiento));
      this.formTelefono.set(String(item.telefono ?? ''));
      this.formEmail.set(String(item.email ?? ''));
      this.formDireccion.set(String(item.direccion ?? ''));
      this.formEstado.set(this.normalizeEstado(item.estado as string));

      this.formCodigo.set(String(item.codigo ?? ''));
      this.formFechaRegistro.set(this.formatDate(item.fechaRegistro));
      this.formUsuarioRegistro.set(String(item.usuarioRegistro ?? ''));
    }
  }

  onCancelar(): void {
    this.dialogRef.close(false);
  }

  onGuardar(): void {
    const identificacion = this.formIdentificacion();
    const nombres = this.normalizeText(this.formNombres());
    const apellidos = this.normalizeText(this.formApellidos());
    const fechaNacimiento = this.formFechaNacimiento();
    const telefono = this.normalizeText(this.formTelefono());
    const email = this.formEmail().trim();
    const direccion = this.formDireccion().trim();
    const estado = this.toBackendEstado(this.formEstado());

    if (!identificacion) {
      this.errorMsg.set('Identificacion es obligatoria');
      return;
    }

    if (nombres.length < 2) {
      this.errorMsg.set('Nombres debe tener al menos 2 caracteres');
      return;
    }

    if (apellidos.length < 2) {
      this.errorMsg.set('Apellidos debe tener al menos 2 caracteres');
      return;
    }

    if (email && !this.isValidEmail(email)) {
      this.errorMsg.set('Email no tiene formato valido');
      return;
    }

    if (fechaNacimiento && this.isFutureDate(fechaNacimiento)) {
      this.errorMsg.set('Fecha de nacimiento no puede ser futura');
      return;
    }

    if (!estado) {
      this.errorMsg.set('Estado es obligatorio');
      return;
    }

    const current = this.data?.item ?? null;
    const isUpdate = !!current?.codigo && Number(current.codigo) > 0;

    const payload: Partial<Empleado> & { identificacion?: number } = {
      nombres,
      apellidos,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : (undefined as any),
      telefono,
      email,
      direccion,
      estado,
    };

    if (identificacion?.codigoAlterno !== undefined && identificacion?.codigoAlterno !== null) {
      payload.identificacion = identificacion.codigoAlterno;
    }

    if (isUpdate) {
      payload.codigo = current!.codigo;
      payload.fechaRegistro = current?.fechaRegistro ?? undefined;
      payload.usuarioRegistro = current?.usuarioRegistro ?? this.getUsuarioRegistro();
    } else {
      payload.fechaRegistro = new Date();
      payload.usuarioRegistro = this.getUsuarioRegistro();
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const request$ = isUpdate
      ? this.empleadoService.update(payload)
      : this.empleadoService.add(payload);

    request$.subscribe({
      next: (res: Empleado | null) => {
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
        let errorMessage = 'Error al guardar';

        if (err?.status === 404) {
          errorMessage = 'Endpoint no encontrado (404). Verifica el backend.';
        } else if (err?.status === 500) {
          errorMessage = 'Error interno del servidor (500). Revisa los logs.';
        } else if (err?.status === 0) {
          errorMessage = 'No se puede conectar al backend. Verifica el proxy.';
        } else {
          errorMessage = this.extractError(err) || 'Error al guardar';
        }

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

  private formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private loadCombos(): void {
    this.loadIdentificaciones();
  }

  private loadIdentificaciones(): void {
    const cached = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION);
    if (cached.length) {
      this.identificaciones.set(cached);
      if (!this.formIdentificacion() && this.initialIdentificacion) {
        const resolved = this.resolveIdentificacion(this.initialIdentificacion);
        if (resolved) this.formIdentificacion.set(resolved);
      }
      return;
    }

    this.detalleRubroService.inicializar().subscribe({
      next: () => {
        const items = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION);
        this.identificaciones.set(items);
        if (!this.formIdentificacion() && this.initialIdentificacion) {
          const resolved = this.resolveIdentificacion(this.initialIdentificacion);
          if (resolved) this.formIdentificacion.set(resolved);
        }
      },
      error: () => this.identificaciones.set([]),
    });
  }

  compareIdentificacion = (a: DetalleRubro | null, b: DetalleRubro | null): boolean => {
    if (!a || !b) return a === b;
    return a.codigoAlterno === b.codigoAlterno && a.rubro?.codigoAlterno === b.rubro?.codigoAlterno;
  };

  private resolveIdentificacion(
    value: Empleado['identificacion'] | null | undefined,
  ): DetalleRubro | null {
    if (!value) return null;
    if (typeof value === 'object' && 'codigoAlterno' in value) {
      return value as DetalleRubro;
    }

    const items = this.identificaciones();
    if (!items.length) return null;

    const needle = value.toString();
    return (
      items.find((item) => item.codigoAlterno?.toString() === needle) ??
      items.find((item) => item.valorNumerico?.toString() === needle) ??
      items.find((item) => item.valorAlfanumerico?.toString() === needle) ??
      items.find((item) => item.descripcion?.toString().toUpperCase() === needle.toUpperCase()) ??
      null
    );
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private normalizeEstado(value?: string | number | null): string {
    if (value === null || value === undefined) return 'A';
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT') ? 'A' : 'I';
  }

  private toBackendEstado(value?: string | null): string {
    if (!value) return 'A';
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT') ? 'A' : 'I';
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isFutureDate(value: string): boolean {
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() > today.getTime();
  }

  private extractRows<T>(rows: T[] | { data?: T[]; rows?: T[]; contenido?: T[] } | null): T[] {
    if (Array.isArray(rows)) return rows;
    if (!rows) return [];
    if (Array.isArray(rows.data)) return rows.data;
    if (Array.isArray(rows.rows)) return rows.rows;
    if (Array.isArray(rows.contenido)) return rows.contenido;
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
