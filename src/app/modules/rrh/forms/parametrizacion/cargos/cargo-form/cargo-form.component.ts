import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of, switchMap } from 'rxjs';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { Cargo } from '../../../../model/cargo';
import { CargoService } from '../../../../service/cargo.service';
import { DepartamentoService } from '../../../../service/departamento.service';
import { HistorialService } from '../../../../service/historial.service';

export interface CargoFormData {
  mode: 'new' | 'edit';
  cargo?: Cargo | null;
}

@Component({
  selector: 'app-cargo-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './cargo-form.component.html',
  styleUrls: ['./cargo-form.component.scss'],
})
export class CargoFormComponent implements OnInit {
  formNombre = signal<string>('');
  formDescripcion = signal<string>('');
  formRequisitos = signal<string>('');
  formEstado = signal<string>('A');
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  constructor(
    private dialogRef: MatDialogRef<CargoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CargoFormData,
    private cargoService: CargoService,
    private departamentoCargoService: DepartamentoService,
    private historialService: HistorialService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const cargo = this.data?.cargo ?? null;
    if (cargo) {
      this.formNombre.set((cargo.nombre ?? '').toString().toUpperCase());
      this.formDescripcion.set((cargo.descripcion ?? '').toString());
      this.formRequisitos.set((cargo.requisitos ?? '').toString());
      this.formEstado.set(this.normalizeEstado(cargo.estado));
    }
  }

  onCancelar(): void {
    this.dialogRef.close(false);
  }

  onNombreChange(value: string): void {
    this.formNombre.set((value ?? '').toUpperCase());
  }

  onGuardar(): void {
    const nombre = this.normalizeNombre(this.formNombre());
    if (!nombre || nombre.length < 3) {
      this.errorMsg.set('El nombre es obligatorio y debe tener al menos 3 caracteres');
      return;
    }

    if (this.hasDoubleSpaces(this.formNombre())) {
      this.errorMsg.set('El nombre no debe contener dobles espacios');
      return;
    }

    const descripcion = this.formDescripcion().trim();
    const requisitos = this.formRequisitos().trim();
    const estado = this.formEstado();

    const current = this.data?.cargo ?? null;
    const isUpdate = !!current?.codigo && current.codigo > 0;

    const payload: Partial<Cargo> = {
      nombre,
      descripcion: descripcion || null,
      requisitos: requisitos || null,
      estado,
      usuarioRegistro: this.getUsuarioRegistro(),
    };

    if (isUpdate) {
      payload.codigo = current!.codigo;
      payload.fechaRegistro = current?.fechaRegistro ?? new Date();
    } else {
      payload.fechaRegistro = new Date();
    }

    this.loading.set(true);
    this.errorMsg.set('');

    this.validarNombreUnico(nombre, current?.codigo)
      .pipe(
        switchMap((isUnique) => {
          if (!isUnique) {
            this.errorMsg.set('Ya existe un cargo activo con ese nombre');
            return of(false);
          }
          if (this.isInactivo(estado) && current?.codigo) {
            return this.validarInactivacion(current.codigo).pipe(map((ok) => ok));
          }
          return of(true);
        }),
        switchMap((ok) => {
          if (!ok) return of(null);
          return isUpdate ? this.cargoService.update(payload) : this.cargoService.add(payload);
        }),
      )
      .subscribe({
        next: (result: Cargo | null) => {
          if (!result) {
            this.loading.set(false);
            return;
          }
          this.snackBar.open('Guardado correctamente', 'Cerrar', {
            duration: 3500,
            panelClass: ['success-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          this.dialogRef.close(true);
        },
        error: (err: unknown) => {
          this.errorMsg.set(this.extractError(err) || 'Error al guardar');
          this.snackBar.open(this.errorMsg(), 'Cerrar', {
            duration: 5000,
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

    return this.cargoService.selectByCriteria(criterios).pipe(
      map((rows: Cargo[] | null) => {
        const items = Array.isArray(rows) ? rows : [];
        const activos = items.filter((r) => this.isActivo(r?.estado));
        if (!activos.length) return true;
        if (!currentId) return false;
        return activos.every((r) => r.codigo === currentId);
      }),
      catchError(() => of(true)),
    );
  }

  private validarInactivacion(cargoId: number) {
    const hstrCriteria: DatosBusqueda[] = [];
    const hstrCargo = new DatosBusqueda();
    hstrCargo.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'cargo',
      'codigo',
      String(cargoId),
      TipoComandosBusqueda.IGUAL,
    );
    hstrCriteria.push(hstrCargo);
    const hstrActivo = new DatosBusqueda();
    hstrActivo.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.INTEGER,
      'actual',
      '1',
      TipoComandosBusqueda.IGUAL,
    );
    hstrCriteria.push(hstrActivo);

    return this.historialService.selectByCriteria(hstrCriteria).pipe(
      map((hstrRows) => {
        const hstr = Array.isArray(hstrRows) ? hstrRows : [];
        if (hstr.length) {
          this.errorMsg.set('No se puede inactivar: existe historial vigente');
          return false;
        }
        return true;
      }),
    );
  }

  private normalizeNombre(value: string): string {
    return (value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  private hasDoubleSpaces(value: string): boolean {
    return /\s{2,}/.test(value ?? '');
  }

  private normalizeEstado(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return 'A';
    const normalized = value.toString().toUpperCase();
    if (normalized === '1' || normalized === 'A' || normalized.startsWith('ACT')) {
      return 'A';
    }
    if (normalized === '0' || normalized === 'I' || normalized.startsWith('INA')) {
      return 'I';
    }
    return 'A';
  }

  private isActivo(value: number | string | null | undefined): boolean {
    if (value === null || value === undefined) return false;
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT');
  }

  private isInactivo(value: number | string | null | undefined): boolean {
    if (value === null || value === undefined) return false;
    const normalized = value.toString().toUpperCase();
    return normalized === '0' || normalized === 'I' || normalized.startsWith('INA');
  }

  private getUsuarioRegistro(): string {
    const raw =
      localStorage.getItem('usuarioRegistro') ||
      localStorage.getItem('usuario') ||
      localStorage.getItem('username') ||
      localStorage.getItem('user') ||
      'web';
    return String(raw).substring(0, 59);
  }

  private extractError(error: any): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error?.message === 'string') return error.message;
    return '';
  }
}
