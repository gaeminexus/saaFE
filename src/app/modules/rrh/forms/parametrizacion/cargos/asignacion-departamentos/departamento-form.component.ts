import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of, switchMap } from 'rxjs';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { Departamento } from '../../../../model/departamento';
import { DepartamentoService } from '../../../../service/departamento.service';

export interface DepartamentoFormData {
  mode: 'new' | 'edit';
  item?: Departamento | null;
}

@Component({
  selector: 'app-departamento-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './departamento-form.component.html',
  styleUrls: ['./departamento-form.component.scss'],
})
export class DepartamentoFormComponent implements OnInit {
  formNombre = signal<string>('');
  formEstado = signal<string>('A');
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  estadoOptions = [
    { value: 'A', label: 'Activo' },
    { value: 'I', label: 'Inactivo' },
  ];

  constructor(
    private dialogRef: MatDialogRef<DepartamentoFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DepartamentoFormData,
    private departamentoService: DepartamentoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const item = this.data?.item ?? null;
    if (item) {
      this.formNombre.set(item.nombre ?? '');
      this.formEstado.set(this.normalizeEstado(item.estado));
    }
  }

  onCancelar(): void {
    this.dialogRef.close(false);
  }

  onGuardar(): void {
    const nombre = this.formNombre().trim();
    const estado = this.formEstado();

    if (!nombre) {
      this.errorMsg.set('Nombre es obligatorio');
      return;
    }

    if (nombre.length < 3) {
      this.errorMsg.set('Nombre debe tener al menos 3 caracteres');
      return;
    }

    if (/\s{2,}/.test(nombre)) {
      this.errorMsg.set('Nombre no puede tener dobles espacios');
      return;
    }

    const current = this.data?.item ?? null;
    const isUpdate = !!current?.codigo && current.codigo > 0;

    const payload: Partial<Departamento> = {
      nombre,
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

    this.validarNombreActivo(nombre, current?.codigo)
      .pipe(
        switchMap((ok) => {
          if (!ok) {
            this.errorMsg.set('Ya existe un registro activo con ese nombre');
            this.loading.set(false);
            return of(null);
          }
          return isUpdate
            ? this.departamentoService.update(payload)
            : this.departamentoService.add(payload);
        }),
      )
      .subscribe({
        next: (res: Departamento | null) => {
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
        error: () => {
          this.snackBar.open('Error al guardar', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'right',
            verticalPosition: 'top',
          });
          this.loading.set(false);
        },
      });
  }

  private validarNombreActivo(nombre: string, currentId?: number | null) {
    const criterios: DatosBusqueda[] = [];

    const dbNombre = new DatosBusqueda();
    dbNombre.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'nombre',
      nombre,
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbNombre);

    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'estado',
      'A',
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEstado);

    return this.departamentoService.selectByCriteria(criterios).pipe(
      map((rows: Departamento[] | null) => this.esNombreUnico(rows, currentId)),
      catchError(() =>
        this.departamentoService
          .getAll()
          .pipe(
            map((rows) => this.esNombreUnico(this.filterByNombreActivo(rows, nombre), currentId)),
          ),
      ),
    );
  }

  private filterByNombreActivo(rows: Departamento[] | null, nombre: string) {
    const target = nombre.trim().toUpperCase();
    const items = Array.isArray(rows) ? rows : [];
    return items.filter(
      (r) =>
        (r?.estado ?? '').toString().toUpperCase().startsWith('A') &&
        (r?.nombre ?? '').toString().toUpperCase() === target,
    );
  }

  private esNombreUnico(rows: Departamento[] | null, currentId?: number | null): boolean {
    const items = Array.isArray(rows) ? rows : [];
    if (!items.length) return true;
    if (!currentId) return false;
    return items.every((r) => r.codigo === currentId);
  }

  private normalizeEstado(value?: string | number | null): string {
    if (value === null || value === undefined) return 'A';
    const normalized = value.toString().toUpperCase();
    if (normalized === '1' || normalized === 'A' || normalized.startsWith('ACT')) {
      return 'A';
    }
    return 'I';
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
}
