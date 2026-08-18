import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MaterialFormModule } from '../../modules/material-form.module';
import { PlanCuenta } from '../../../modules/cnt/model/plan-cuenta';

/**
 * Forma estructural que necesita el selector. Tanto el grupo de producto de
 * cobro (CXC) como el de pago (CXP) la cumplen, así que el diálogo sirve a las
 * dos pantallas sin acoplarse a ninguno de los dos modelos.
 */
export interface GrupoProductoSeleccionable {
  codigo: number;
  nombre: string | String;
  planCuenta?: PlanCuenta | null;
}

export interface GrupoProductoSelectorDialogData {
  /** Grupos ya cargados por la pantalla; se filtran localmente. */
  grupos: GrupoProductoSeleccionable[];
  titulo?: string;
}

/**
 * Selector de Grupo de producto con búsqueda por número de cuenta contable o
 * por nombre del grupo. Se usa donde el combo desplegable se queda corto porque
 * hay muchos grupos y se necesita ver la cuenta contable.
 */
@Component({
  selector: 'app-grupo-producto-selector-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './grupo-producto-selector-dialog.component.html',
  styleUrl: './grupo-producto-selector-dialog.component.scss',
})
export class GrupoProductoSelectorDialogComponent {
  private dialogRef = inject(
    MatDialogRef<GrupoProductoSelectorDialogComponent, GrupoProductoSeleccionable | null>,
  );

  filtroControl = new UntypedFormControl('');
  grupos = signal<GrupoProductoSeleccionable[]>([]);

  /** Todos los grupos recibidos (sin filtrar). */
  private todosLosGrupos: GrupoProductoSeleccionable[] = [];

  columnas = ['cuenta', 'nombre', 'acciones'];
  dataSource = new MatTableDataSource<GrupoProductoSeleccionable>([]);

  constructor(@Inject(MAT_DIALOG_DATA) public data: GrupoProductoSelectorDialogData) {
    this.todosLosGrupos = data?.grupos ?? [];
    this.grupos.set(this.todosLosGrupos);
    this.dataSource.data = this.todosLosGrupos;

    this.filtroControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((value) => this.filtrarLocalmente(String(value ?? '')));
  }

  /** Filtra por número de cuenta contable o por nombre del grupo. */
  filtrarLocalmente(termino: string): void {
    const t = (termino || '').trim().toLowerCase();
    const filtrados = !t
      ? this.todosLosGrupos
      : this.todosLosGrupos.filter((g) => {
          const nombre = String(g.nombre ?? '').toLowerCase();
          const cuenta = (g.planCuenta?.cuentaContable ?? '').toLowerCase();
          return nombre.includes(t) || cuenta.includes(t);
        });
    this.grupos.set(filtrados);
    this.dataSource.data = filtrados;
  }

  cuentaContable(grupo: GrupoProductoSeleccionable): string {
    return grupo.planCuenta?.cuentaContable?.trim() || '—';
  }

  seleccionar(grupo: GrupoProductoSeleccionable): void {
    this.dialogRef.close(grupo);
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}
