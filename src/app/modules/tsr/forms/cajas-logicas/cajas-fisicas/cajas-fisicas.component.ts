import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { PlanCuenta } from '../../../../cnt/model/plan-cuenta';
import { PlanCuentaService } from '../../../../cnt/service/plan-cuenta.service';
import { CajaFisica } from '../../../model/caja-fisica';
import { CajaFisicaService } from '../../../service/caja-fisica.service';

@Component({
  selector: 'app-cajas-fisicas',
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
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './cajas-fisicas.component.html',
  styleUrls: ['./cajas-fisicas.component.scss'],
})
export class CajasFisicasComponent implements OnInit {
  title = 'CAJAS FÍSICAS';

  dataSource = new MatTableDataSource<CajaFisica>([]);
  displayedColumns = ['nombre', 'planCuenta', 'fechaIngreso', 'fechaInactivo', 'estado'];

  // Estados de la interfaz
  loading = signal<boolean>(false);
  editMode = signal<boolean>(false);
  selectedRow: CajaFisica | null = null;
  editedData: Partial<CajaFisica> = {};
  originalData: CajaFisica[] = [];

  // Combos
  planesCuenta: PlanCuenta[] = [];

  // Estados
  readonly ESTADO_ACTIVO = 1;
  readonly ESTADO_INACTIVO = 0;
  readonly TIPO_CUENTA_MOVIMIENTO = 3;

  constructor(
    private cajaFisicaService: CajaFisicaService,
    private planCuentaService: PlanCuentaService,
    private funcionesDatos: FuncionesDatosService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarPlanesCuenta();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.cajaFisicaService.getAll().subscribe({
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
        console.error('Error al cargar cajas físicas:', err);
        this.loading.set(false);
        this.snackBar.open('Error al cargar datos', 'Cerrar', { duration: 3000 });
      },
    });
  }

  cargarPlanesCuenta(): void {
    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const cuentasMovimiento = data.filter((p) => p.tipo === this.TIPO_CUENTA_MOVIMIENTO);

          if (cuentasMovimiento.length > 0) {
            this.planesCuenta = cuentasMovimiento.sort((a, b) =>
              a.cuentaContable.localeCompare(b.cuentaContable),
            );
          } else {
            this.planesCuenta = data.sort((a, b) =>
              a.cuentaContable.localeCompare(b.cuentaContable),
            );
          }
        } else {
          this.planesCuenta = [];
        }
      },
      error: (err) => {
        console.error('Error al cargar planes de cuenta:', err);
        this.planesCuenta = [];
      },
    });
  }

  insertar(): void {
    if (this.editMode()) {
      this.snackBar.open('Complete o cancele la operación actual', 'Cerrar', { duration: 3000 });
      return;
    }

    const nuevaCaja: CajaFisica = {
      codigo: 0,
      nombre: '',
      empresa: { codigo: parseInt(localStorage.getItem('empresaId') || '1') } as any,
      planCuenta: {} as PlanCuenta,
      fechaIngreso: '',
      fechaInactivo: null as any,
      estado: this.ESTADO_ACTIVO,
    };

    this.dataSource.data = [nuevaCaja, ...this.dataSource.data];
    this.selectedRow = nuevaCaja;
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

    if (!confirm(`¿Está seguro de eliminar la caja física "${this.selectedRow.nombre}"?`)) {
      return;
    }

    // Eliminación lógica
    const payload = {
      codigo: this.selectedRow.codigo,
      nombre: this.selectedRow.nombre,
      empresa: { codigo: this.selectedRow.empresa.codigo },
      planCuenta: { codigo: this.selectedRow.planCuenta.codigo },
      fechaIngreso: this.selectedRow.fechaIngreso,
      fechaInactivo: new Date().toISOString(),
      estado: this.ESTADO_INACTIVO,
    };

    this.loading.set(true);
    this.cajaFisicaService.update(payload).subscribe({
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

    if (!this.selectedRow?.planCuenta?.codigo) {
      this.snackBar.open('La cuenta contable es obligatoria', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar duplicados
    const existe = this.dataSource.data.some(
      (c) =>
        c.nombre.toLowerCase() === nombre.toLowerCase() && c.codigo !== this.selectedRow?.codigo,
    );
    if (existe) {
      this.snackBar.open('Ya existe una caja física con ese nombre', 'Cerrar', { duration: 3000 });
      return;
    }

    const esNuevo = this.selectedRow!.codigo === 0;

    const payload = {
      codigo: esNuevo ? undefined : this.selectedRow!.codigo,
      nombre: nombre,
      empresa: { codigo: parseInt(localStorage.getItem('empresaId') || '1') },
      planCuenta: { codigo: this.selectedRow!.planCuenta.codigo },
      fechaIngreso: esNuevo ? new Date().toISOString() : this.selectedRow!.fechaIngreso,
      estado: this.selectedRow!.estado,
    };

    this.loading.set(true);

    const operacion = esNuevo
      ? this.cajaFisicaService.add(payload)
      : this.cajaFisicaService.update(payload);

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
      this.dataSource.data = this.dataSource.data.filter((c) => c.codigo !== 0);
    } else {
      // Restaurar datos originales
      this.dataSource.data = JSON.parse(JSON.stringify(this.originalData));
    }

    this.editMode.set(false);
    this.selectedRow = null;
    this.editedData = {};
  }

  seleccionarFila(row: CajaFisica): void {
    if (this.editMode()) {
      return;
    }
    this.selectedRow = row;
  }

  isSelected(row: CajaFisica): boolean {
    return this.selectedRow?.codigo === row.codigo;
  }

  isEditing(row: CajaFisica): boolean {
    return this.editMode() && this.selectedRow?.codigo === row.codigo;
  }

  getEstadoTexto(estado: number): string {
    return estado === this.ESTADO_ACTIVO ? 'ACTIVO' : 'INACTIVO';
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA);
  }

  comparePlanCuenta(p1: PlanCuenta, p2: PlanCuenta): boolean {
    return p1 && p2 ? p1.codigo === p2.codigo : p1 === p2;
  }
}
