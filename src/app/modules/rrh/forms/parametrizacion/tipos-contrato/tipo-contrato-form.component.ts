import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of, switchMap } from 'rxjs';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TipoContratoEmpleado } from '../../../model/tipo-contrato-empleado';
import { TipoContratoEmpleadoService } from '../../../service/tipo-contrato-empleado.service';

export interface TipoContratoFormData {
  mode: 'new' | 'edit';
  item?: TipoContratoEmpleado | null;
}

@Component({
  selector: 'app-tipo-contrato-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './tipo-contrato-form.component.html',
  styleUrls: ['./tipo-contrato-form.component.scss'],
})
export class TipoContratoFormComponent implements OnInit {
  formNombre = signal<string>('');
  formRequiere = signal<boolean>(false);
  formEstado = signal<string>('1');
  formCodigo = signal<string>('');
  formFechaRegistro = signal<string>('');
  formUsuarioRegistro = signal<string>('');

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  estadoOptions = [
    { value: '1', label: 'Activo' },
    { value: '0', label: 'Inactivo' },
  ];

  constructor(
    private dialogRef: MatDialogRef<TipoContratoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TipoContratoFormData,
    private tipoContratoService: TipoContratoEmpleadoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const item = this.data?.item ?? null;
    if (item) {
      this.formNombre.set(String(item.nombre ?? ''));
      this.formRequiere.set(this.isRequiere(item.requiereFechaFin as string));
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
    const estado = this.toBackendEstado(this.formEstado());
    const requiere = this.toBackendRequiere(this.formRequiere());

    if (!nombre) {
      this.errorMsg.set('Nombre es obligatorio');
      return;
    }

    if (nombre.length < 3) {
      this.errorMsg.set('Nombre debe tener al menos 3 caracteres');
      return;
    }

    if (!estado) {
      this.errorMsg.set('Estado es obligatorio');
      return;
    }

    const current = this.data?.item ?? null;
    const isUpdate = !!current?.codigo && Number(current.codigo) > 0;

    const payload: Partial<TipoContratoEmpleado> = {
      nombre,
      estado,
    };

    if (requiere !== null) {
      payload.requiereFechaFin = requiere;
    }

    if (isUpdate) {
      payload.codigo = current!.codigo;
      payload.fechaRegistro = current?.fechaRegistro ?? undefined;
    }

    console.log('[TipoContratoForm] guardar', {
      mode: this.data?.mode,
      isUpdate,
      payload,
    });

    this.loading.set(true);
    this.errorMsg.set('');

    this.validarNombreUnico(nombre, current?.codigo)
      .pipe(
        switchMap((ok) => {
          if (!ok) {
            this.errorMsg.set('Ya existe un tipo de contrato activo con ese nombre');
            this.loading.set(false);
            return of(null);
          }
          return isUpdate
            ? this.tipoContratoService.update(payload)
            : this.tipoContratoService.add(payload);
        }),
      )
      .subscribe({
        next: (res: TipoContratoEmpleado | null) => {
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
          console.error('🔴 Error al guardar tipo contrato:', err);
          console.error('   Tipo de error:', typeof err);
          console.error('   Status:', err?.status);
          console.error('   StatusText:', err?.statusText);
          console.error('   Message:', err?.message);
          console.error('   URL que falló:', err?.url);

          let errorMessage = 'Error al guardar';

          if (err?.status === 404) {
            errorMessage =
              'Endpoint no encontrado (404). Verifica que el backend esté ejecutándose.';
          } else if (err?.status === 500) {
            errorMessage = 'Error interno del servidor (500). Revisa los logs del backend.';
          } else if (err?.status === 0) {
            errorMessage = 'No se puede conectar al backend. Verifica la configuración de proxy.';
          } else {
            errorMessage = this.extractError(err) || 'Error al guardar';
          }

          this.snackBar.open(errorMessage, 'Cerrar', {
            duration: 8000, // Más tiempo para leer errores detail
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

    console.log('[TipoContratoForm] validarNombreUnico criterios', criterios);
    return this.tipoContratoService.selectByCriteria(criterios).pipe(
      map((rows: TipoContratoEmpleado[] | null) => {
        const items = Array.isArray(rows) ? rows : [];
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
    if (value === null || value === undefined) return '1';
    const normalized = value.toString().toUpperCase();
    if (normalized === '1' || normalized === 'A' || normalized.startsWith('ACT')) {
      return '1';
    }
    return '0';
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

  private toBackendRequiere(value: boolean): string | null {
    return value ? '1' : null;
  }

  private toBackendEstado(value?: string | null): string {
    if (!value) return '1';
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT') ? '1' : '0';
  }

  private formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
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
