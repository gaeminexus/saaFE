import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { GrupoCaja } from '../../../model/grupo-caja';
import { GrupoCajaService } from '../../../service/grupo-caja.service';

@Component({
  selector: 'app-grupos-cajas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './grupos-cajas.component.html',
  styleUrls: ['./grupos-cajas.component.scss'],
})
export class GruposCajasComponent implements OnInit {
  title = 'GRUPO CAJA';

  dataSource = new MatTableDataSource<GrupoCaja>([]);
  displayedColumns = ['nombre', 'fechaIngreso', 'fechaInactivo', 'estado'];

  // Estados de la interfaz
  loading = signal<boolean>(false);
  editMode = signal<boolean>(false);
  selectedRow: GrupoCaja | null = null;
  editedData: Partial<GrupoCaja> = {};
  originalData: GrupoCaja[] = [];

  // Estados
  readonly ESTADO_ACTIVO = 1;
  readonly ESTADO_INACTIVO = 0;

  constructor(
    private grupoCajaService: GrupoCajaService,
    private funcionesDatos: FuncionesDatosService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.grupoCajaService.getAll().subscribe({
      next: (data) => {
        this.loading.set(false);
        if (data && data.length > 0) {
          this.originalData = JSON.parse(JSON.stringify(data));
          this.dataSource.data = data;
        } else {
          this.originalData = [];
          this.dataSource.data = [];
        }
      },
      error: (err) => {
        console.error('Error al cargar grupos de caja:', err);
        this.loading.set(false);
        this.snackBar.open('Error al cargar datos', 'Cerrar', { duration: 3000 });
      },
    });
  }

  insertar(): void {
    if (this.editMode()) {
      this.snackBar.open('Complete o cancele la operación actual', 'Cerrar', { duration: 3000 });
      return;
    }

    const nuevoGrupo: GrupoCaja = {
      codigo: 0,
      nombre: '',
      empresa: { codigo: parseInt(localStorage.getItem('empresaId') || '1') } as any,
      fechaIngreso: new Date(),
      fechaInactivo: null as any,
      estado: this.ESTADO_ACTIVO,
    };

    this.dataSource.data = [nuevoGrupo, ...this.dataSource.data];
    this.selectedRow = nuevoGrupo;
    this.editMode.set(true);
  }

  modificar(): void {
    if (!this.selectedRow) {
      this.snackBar.open('Seleccione un registro para modificar', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.editMode()) {
      this.snackBar.open('Ya está en modo edición', 'Cerrar', { duration: 3000 });
      return;
    }

    this.editedData = { ...this.selectedRow };
    this.editMode.set(true);
  }

  eliminar(): void {
    if (!this.selectedRow) {
      this.snackBar.open('Seleccione un registro para eliminar', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.editMode()) {
      this.snackBar.open('Complete o cancele la operación actual', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!confirm(`¿Está seguro de eliminar el grupo "${this.selectedRow.nombre}"?`)) {
      return;
    }

    // Eliminación lógica: cambiar estado a INACTIVO y poner fecha de eliminación
    const payload = {
      codigo: this.selectedRow.codigo,
      nombre: this.selectedRow.nombre,
      fechaIngreso: this.selectedRow.fechaIngreso,
      // LocalDateTime en el backend; nunca `.toISOString()` (UTC, termina en "Z" — regla de CLAUDE.md).
      fechaInactivo: this.funcionesDatos.formatearFechaParaBackend(new Date()),
      estado: this.ESTADO_INACTIVO,
      empresa: this.selectedRow.empresa,
    };

    this.loading.set(true);
    this.grupoCajaService.update(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('✓ Registro eliminado correctamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
        });
        this.cargarDatos();
        this.selectedRow = null;
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.loading.set(false);
        this.snackBar.open('✗ Error al eliminar registro', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error'],
        });
      },
    });
  }

  aceptar(): void {
    if (!this.editMode()) {
      return;
    }

    // Validaciones
    const nombre = this.selectedRow?.nombre?.trim();
    if (!nombre) {
      this.snackBar.open('El nombre es obligatorio', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar duplicados
    const existe = this.dataSource.data.some(
      (g) =>
        g.nombre.toLowerCase() === nombre.toLowerCase() && g.codigo !== this.selectedRow?.codigo,
    );
    if (existe) {
      this.snackBar.open('Ya existe un grupo con ese nombre', 'Cerrar', { duration: 3000 });
      return;
    }

    const esNuevo = this.selectedRow!.codigo === 0;

    const payload = {
      codigo: esNuevo ? undefined : this.selectedRow!.codigo,
      nombre: nombre,
      fechaIngreso: esNuevo ? this.funcionesDatos.formatearFechaParaBackend(new Date()) : this.selectedRow!.fechaIngreso,
      estado: this.selectedRow!.estado,
      empresa: { codigo: parseInt(localStorage.getItem('empresaId') || '1') },
    };

    this.loading.set(true);

    const operacion = esNuevo
      ? this.grupoCajaService.add(payload)
      : this.grupoCajaService.update(payload);

    operacion.subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open(
          `✓ Registro ${esNuevo ? 'creado' : 'actualizado'} correctamente`,
          'Cerrar',
          {
            duration: 3000,
            panelClass: ['snackbar-success'],
          },
        );
        this.editMode.set(false);
        this.selectedRow = null;
        this.editedData = {};
        this.cargarDatos();
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.loading.set(false);
        this.snackBar.open('✗ Error al guardar registro', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error'],
        });
      },
    });
  }

  cancelar(): void {
    if (!this.editMode()) {
      return;
    }

    // Si es nuevo, eliminarlo de la lista
    if (this.selectedRow?.codigo === 0) {
      this.dataSource.data = this.dataSource.data.filter((g) => g.codigo !== 0);
    } else {
      // Restaurar datos originales
      this.dataSource.data = JSON.parse(JSON.stringify(this.originalData));
    }

    this.editMode.set(false);
    this.selectedRow = null;
    this.editedData = {};
  }

  seleccionarFila(row: GrupoCaja): void {
    if (this.editMode()) {
      return;
    }
    this.selectedRow = row;
  }

  isSelected(row: GrupoCaja): boolean {
    return this.selectedRow?.codigo === row.codigo;
  }

  isEditing(row: GrupoCaja): boolean {
    return this.editMode() && this.selectedRow?.codigo === row.codigo;
  }

  getEstadoTexto(estado: number): string {
    return estado === this.ESTADO_ACTIVO ? 'ACTIVO' : 'INACTIVO';
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA);
  }
}
