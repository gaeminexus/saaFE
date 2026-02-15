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
import { Departamento } from '../../../../model/departamento';
import { DepartamentoCargo } from '../../../../model/departamento-cargo';
import { CargoService } from '../../../../service/cargo.service';
import { DepartamentoService } from '../../../../service/departamento.service';
import { DepartementoCargoService } from '../../../../service/departemento-cargo.service';

export interface DepartamentoCargoFormData {
  mode: 'new' | 'edit';
  item?: DepartamentoCargo | null;
}

@Component({
  selector: 'app-departamento-cargo-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './departamento-cargo-form.component.html',
  styleUrls: ['./departamento-cargo-form.component.scss'],
})
export class DepartamentoCargoFormComponent implements OnInit {
  formDepartamento = signal<number | null>(null);
  formCargo = signal<number | null>(null);
  formEstado = signal<string>('A');
  formCodigo = signal<string>('');
  formFechaRegistro = signal<string>('');
  formUsuarioRegistro = signal<string>('');

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  departamentos = signal<Departamento[]>([]);
  cargos = signal<Cargo[]>([]);

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  constructor(
    private dialogRef: MatDialogRef<DepartamentoCargoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DepartamentoCargoFormData,
    private departamentoCargoService: DepartementoCargoService,
    private departamentoService: DepartamentoService,
    private cargoService: CargoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadDepartamentosActivos();
    this.loadCargosActivos();

    const item = this.data?.item ?? null;
    if (item) {
      this.formDepartamento.set(item.Departamento?.codigo ?? null);
      this.formCargo.set(item.Cargo?.codigo ?? null);
      this.formEstado.set(this.normalizeEstado(item.estado));
      this.formCodigo.set(String(item.codigo ?? ''));
      this.formFechaRegistro.set(this.formatDate(item.fechaRegistro));
      this.formUsuarioRegistro.set(String(item.usuarioRegistro ?? ''));
    }
  }

  onCancelar(): void {
    this.dialogRef.close(false);
  }

  onGuardar(): void {
    const departamentoId = this.formDepartamento();
    const cargoId = this.formCargo();
    const estado = this.formEstado();

    if (!departamentoId) {
      this.errorMsg.set('Departamento es obligatorio');
      return;
    }

    if (!cargoId) {
      this.errorMsg.set('Cargo es obligatorio');
      return;
    }

    const current = this.data?.item ?? null;
    const isUpdate = !!current?.codigo && current.codigo > 0;

    const payload: Partial<DepartamentoCargo> = {
      Departamento: { codigo: departamentoId } as Departamento,
      Cargo: { codigo: cargoId } as Cargo,
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

    this.validarDuplicadoActivo(departamentoId, cargoId, current?.codigo)
      .pipe(
        switchMap((ok) => {
          if (!ok) {
            this.errorMsg.set('Ya existe una relacion activa con este Departamento y Cargo');
            this.loading.set(false);
            return of(null);
          }
          return isUpdate
            ? this.departamentoCargoService.update(payload)
            : this.departamentoCargoService.add(payload);
        }),
      )
      .subscribe({
        next: (res: DepartamentoCargo | null) => {
          if (!res) {
            return;
          }
          this.snackBar.open('Registro guardado', 'Cerrar', {
            duration: 3500,
            panelClass: ['success-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.snackBar.open(this.extractError(err) || 'Error al guardar', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          this.loading.set(false);
        },
      });
  }

  private loadDepartamentosActivos(): void {
    const criterios: DatosBusqueda[] = [];
    const estado = new DatosBusqueda();
    estado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'estado',
      'A',
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(estado);

    this.departamentoService.selectByCriteria(criterios).subscribe({
      next: (rows: Departamento[] | null) => {
        this.departamentos.set(Array.isArray(rows) ? rows : []);
      },
      error: () => this.showError('Error al cargar departamentos'),
    });
  }

  private loadCargosActivos(): void {
    const criterios: DatosBusqueda[] = [];
    const estado = new DatosBusqueda();
    estado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.INTEGER,
      'estado',
      '1',
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(estado);

    this.cargoService.selectByCriteria(criterios).subscribe({
      next: (rows: Cargo[] | null) => {
        this.cargos.set(Array.isArray(rows) ? rows : []);
      },
      error: () => this.showError('Error al cargar cargos'),
    });
  }

  private validarDuplicadoActivo(
    departamentoId: number,
    cargoId: number,
    currentId?: number | null,
  ) {
    const criterios: DatosBusqueda[] = [];
    const dbDepartamento = new DatosBusqueda();
    dbDepartamento.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'Departamento',
      'codigo',
      String(departamentoId),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbDepartamento);

    const dbCargo = new DatosBusqueda();
    dbCargo.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'Cargo',
      'codigo',
      String(cargoId),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbCargo);

    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'estado',
      'A',
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEstado);

    return this.departamentoCargoService.selectByCriteria(criterios).pipe(
      map((rows: DepartamentoCargo[] | null) => {
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) return true;
        if (!currentId) return false;
        return items.every((r) => r.codigo === currentId);
      }),
      catchError(() => of(true)),
    );
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

  private normalizeEstado(value?: string | number | null): string {
    if (value === null || value === undefined) return 'A';
    const normalized = value.toString().toUpperCase();
    if (normalized === '1' || normalized === 'A' || normalized.startsWith('ACT')) {
      return 'A';
    }
    return 'I';
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

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
