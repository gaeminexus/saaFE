import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of, switchMap } from 'rxjs';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Turno } from '../../../model/turno';
import { TurnoService } from '../../../service/turno.service';

export interface TurnoFormData {
  mode: 'new' | 'edit';
  item?: Turno | null;
}

@Component({
  selector: 'app-turno-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './turno-form.component.html',
  styleUrls: ['./turno-form.component.scss'],
})
export class TurnoFormComponent implements OnInit {
  formNombre = signal<string>('');
  formHoraEntrada = signal<string>('');
  formHoraSalida = signal<string>('');
  formToleranciaMinutos = signal<string>('0');
  formRequiereSalida = signal<boolean>(false);
  formEstado = signal<string>('A');
  formCodigo = signal<string>('');
  formFechaRegistro = signal<string>('');
  formUsuarioRegistro = signal<string>('');

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  constructor(
    private dialogRef: MatDialogRef<TurnoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TurnoFormData,
    private turnoService: TurnoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const item = this.data?.item ?? null;
    if (item) {
      this.formNombre.set(String(item.nombre ?? ''));
      this.formHoraEntrada.set(this.normalizeHora(item.horaEntrada));
      this.formHoraSalida.set(this.normalizeHora(item.horaSalida));
      this.formToleranciaMinutos.set(String(item.toleranciaMinutos ?? 0));
      this.formRequiereSalida.set(this.isRequiere(item.requiereMarcacionSalida));
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
    const nombre = this.normalizeNombre(this.formNombre());
    const horaEntrada = this.normalizeHora(this.formHoraEntrada());
    const horaSalida = this.normalizeHora(this.formHoraSalida());
    const tolerancia = this.parseNonNegativeNumber(this.formToleranciaMinutos());
    const estado = this.toBackendEstado(this.formEstado());
    const requiere = this.toBackendRequiere(this.formRequiereSalida());

    if (!nombre) {
      this.errorMsg.set('Nombre es obligatorio');
      return;
    }

    if (nombre.length < 3) {
      this.errorMsg.set('Nombre debe tener al menos 3 caracteres');
      return;
    }

    if (!horaEntrada) {
      this.errorMsg.set('Hora de entrada es obligatoria');
      return;
    }

    if (!horaSalida) {
      this.errorMsg.set('Hora de salida es obligatoria');
      return;
    }

    const entradaMin = this.parseTimeToMinutes(horaEntrada);
    const salidaMin = this.parseTimeToMinutes(horaSalida);
    if (entradaMin === null || salidaMin === null) {
      this.errorMsg.set('Formato de hora invalido');
      return;
    }

    if (salidaMin <= entradaMin) {
      this.errorMsg.set('Hora de salida debe ser mayor que hora de entrada');
      return;
    }

    if (tolerancia === null || tolerancia < 0) {
      this.errorMsg.set('Tolerancia debe ser un numero mayor o igual a 0');
      return;
    }

    if (!estado) {
      this.errorMsg.set('Estado es obligatorio');
      return;
    }

    const current = this.data?.item ?? null;
    const isUpdate = !!current?.codigo && Number(current.codigo) > 0;

    const payload: Partial<Turno> = {
      nombre,
      horaEntrada,
      horaSalida,
      toleranciaMinutos: tolerancia,
      requiereMarcacionSalida: requiere === '1',
      estado,
    };

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

    this.validarNombreUnico(nombre, current?.codigo)
      .pipe(
        switchMap((ok) => {
          if (!ok) {
            this.errorMsg.set('Ya existe un turno activo con ese nombre');
            this.loading.set(false);
            return of(null);
          }
          return isUpdate ? this.turnoService.update(payload) : this.turnoService.add(payload);
        }),
      )
      .subscribe({
        next: (res: Turno | null) => {
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

  private validarNombreUnico(nombre: string, currentId?: number | null) {
    const criterios: DatosBusqueda[] = [];
    const dbNombre = new DatosBusqueda();
    dbNombre.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'nombre',
      nombre,
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbNombre);

    return this.turnoService.selectByCriteria(criterios).pipe(
      map((rows: Turno[] | null) => {
        const items = this.extractRows(rows);
        const activos = items.filter((r) => this.isActivo(String(r.estado ?? '')));
        if (!activos.length) return true;
        if (!currentId) return false;
        return activos.every((r) => r.codigo === currentId);
      }),
      catchError(() => of(true)),
    );
  }

  private normalizeNombre(value: string): string {
    return (value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private normalizeEstado(value?: string | number | null): string {
    if (value === null || value === undefined) return 'A';
    const normalized = value.toString().toUpperCase();
    if (normalized === '1' || normalized === 'A' || normalized.startsWith('ACT')) {
      return 'A';
    }
    return 'I';
  }

  private isActivo(value?: string | number | null): boolean {
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

  private toBackendRequiere(value: boolean): string {
    return value ? '1' : '0';
  }

  private toBackendEstado(value?: string | null): string {
    if (!value) return 'A';
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT') ? 'A' : 'I';
  }

  private formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private normalizeHora(value?: string | null): string {
    return (value ?? '').trim();
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

  private parseNonNegativeNumber(value: string): number | null {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return null;
    return parsed;
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
