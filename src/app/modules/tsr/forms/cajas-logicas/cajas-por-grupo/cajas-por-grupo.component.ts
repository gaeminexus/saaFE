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
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { PlanCuenta } from '../../../../cnt/model/plan-cuenta';
import { PlanCuentaService } from '../../../../cnt/service/plan-cuenta.service';
import { CajaLogica } from '../../../model/caja-logica';
import { GrupoCaja } from '../../../model/grupo-caja';
import { CajaLogicaService } from '../../../service/caja-logica.service';
import { GrupoCajaService } from '../../../service/grupo-caja.service';

@Component({
  selector: 'app-cajas-por-grupo',
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
  templateUrl: './cajas-por-grupo.component.html',
  styleUrls: ['./cajas-por-grupo.component.scss'],
})
export class CajasPorGrupoComponent implements OnInit {
  title = 'ADMINISTRACIÓN CAJA POR GRUPO';

  dataSource = new MatTableDataSource<CajaLogica>([]);
  displayedColumns = ['nombre', 'planCuenta', 'fechaIngreso', 'fechaInactivo', 'estado'];

  // Estados de la interfaz
  loading = signal<boolean>(false);
  editMode = signal<boolean>(false);
  selectedRow: CajaLogica | null = null;
  editedData: Partial<CajaLogica> = {};
  originalData: CajaLogica[] = [];

  // Combos
  gruposCaja: GrupoCaja[] = [];
  grupoSeleccionado: number | null = null;
  planesCuenta: PlanCuenta[] = [];

  // Estados
  readonly ESTADO_ACTIVO = 1;
  readonly ESTADO_INACTIVO = 0;
  readonly TIPO_CUENTA_MOVIMIENTO = 3; // TipoCuentaContable.MOVIMIENTO

  constructor(
    private cajaLogicaService: CajaLogicaService,
    private grupoCajaService: GrupoCajaService,
    private planCuentaService: PlanCuentaService,
    private funcionesDatos: FuncionesDatosService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarGrupos();
    this.cargarPlanesCuenta();
  }

  cargarGrupos(): void {
    this.loading.set(true);
    this.grupoCajaService.getAll().subscribe({
      next: (data) => {
        this.loading.set(false);
        if (data && data.length > 0) {
          // Filtrar solo grupos activos y ordenar alfabéticamente
          this.gruposCaja = data
            .filter((g) => g.estado === this.ESTADO_ACTIVO)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
        } else {
          this.gruposCaja = [];
        }
      },
      error: (err) => {
        console.error('Error al cargar grupos:', err);
        this.loading.set(false);
        this.snackBar.open('Error al cargar grupos de caja', 'Cerrar', { duration: 3000 });
      },
    });
  }

  cargarPlanesCuenta(): void {
    // Cargar cuentas de movimiento (tipo 3) - Usar getAll y filtrar localmente
    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        console.log('Plan de cuentas recibido del servicio:', data);

        if (data && data.length > 0) {
          // Intentar filtrar solo cuentas de tipo MOVIMIENTO (3)
          const cuentasMovimiento = data.filter((p) => p.tipo === this.TIPO_CUENTA_MOVIMIENTO);

          console.log(
            `Total cuentas: ${data.length}, Cuentas tipo MOVIMIENTO (${this.TIPO_CUENTA_MOVIMIENTO}): ${cuentasMovimiento.length}`,
          );

          // Si hay cuentas de movimiento, usarlas. Si no, usar todas
          if (cuentasMovimiento.length > 0) {
            this.planesCuenta = cuentasMovimiento.sort((a, b) =>
              a.cuentaContable.localeCompare(b.cuentaContable),
            );
          } else {
            console.warn('No se encontraron cuentas tipo MOVIMIENTO. Mostrando todas las cuentas.');
            this.planesCuenta = data.sort((a, b) =>
              a.cuentaContable.localeCompare(b.cuentaContable),
            );
          }

          console.log('Cuentas contables disponibles en combo:', this.planesCuenta.length);
        } else {
          this.planesCuenta = [];
          console.warn('No se encontraron cuentas contables');
        }
      },
      error: (err) => {
        console.error('Error al cargar planes de cuenta:', err);
        this.planesCuenta = [];
        this.snackBar.open('Error al cargar cuentas contables', 'Cerrar', { duration: 3000 });
      },
    });
  }

  onGrupoChange(grupoCodigo: number): void {
    if (!grupoCodigo) {
      this.dataSource.data = [];
      return;
    }

    this.grupoSeleccionado = grupoCodigo;
    this.cargarCajasPorGrupo(grupoCodigo);
  }

  cargarCajasPorGrupo(grupoCodigo: number): void {
    this.loading.set(true);

    const criterios: DatosBusqueda[] = [];
    const crit = new DatosBusqueda();
    crit.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'grupoCaja',
      'codigo',
      grupoCodigo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    crit.setNumeroCampoRepetido(0);
    criterios.push(crit);

    this.cajaLogicaService.selectByCriteria(criterios).subscribe({
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
        console.error('Error al cargar cajas lógicas:', err);
        this.loading.set(false);
        // Fallback: intentar getAll y filtrar localmente
        this.cajaLogicaService.getAll().subscribe({
          next: (allData) => {
            if (allData) {
              const filtradas = allData.filter((c) => c.grupoCaja.codigo === grupoCodigo);
              this.originalData = JSON.parse(JSON.stringify(filtradas));
              this.dataSource.data = filtradas;
            }
            this.loading.set(false);
          },
          error: () => {
            this.snackBar.open('Error al cargar cajas lógicas', 'Cerrar', { duration: 3000 });
            this.loading.set(false);
          },
        });
      },
    });
  }

  insertar(): void {
    if (this.editMode()) {
      this.snackBar.open('Complete o cancele la operación actual', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.grupoSeleccionado) {
      this.snackBar.open('Seleccione un grupo de caja primero', 'Cerrar', { duration: 3000 });
      return;
    }

    const nuevaCaja: CajaLogica = {
      codigo: 0,
      nombre: '',
      grupoCaja: this.gruposCaja.find((g) => g.codigo === this.grupoSeleccionado)!,
      planCuenta: {} as PlanCuenta,
      cuentaContable: '',
      fechaIngreso: '',
      fechaInactivo: null as any,
      estado: this.ESTADO_ACTIVO,
    };

    console.log('Insertando nueva caja. Cuentas disponibles:', this.planesCuenta.length);

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

    if (!confirm(`¿Está seguro de eliminar la caja "${this.selectedRow.nombre}"?`)) {
      return;
    }

    // Eliminación lógica
    const payload = {
      codigo: this.selectedRow.codigo,
      nombre: this.selectedRow.nombre,
      grupoCaja: { codigo: this.selectedRow.grupoCaja.codigo },
      planCuenta: { codigo: this.selectedRow.planCuenta.codigo },
      fechaIngreso: this.selectedRow.fechaIngreso,
      fechaInactivo: new Date().toISOString(),
      estado: this.ESTADO_INACTIVO,
    };

    this.loading.set(true);
    this.cajaLogicaService.update(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('✓ Registro eliminado correctamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
        });
        this.cargarCajasPorGrupo(this.grupoSeleccionado!);
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

    // Validar duplicados (mismo nombre en el mismo grupo)
    const existe = this.dataSource.data.some(
      (c) =>
        c.nombre.toLowerCase() === nombre.toLowerCase() &&
        c.codigo !== this.selectedRow?.codigo &&
        c.grupoCaja.codigo === this.selectedRow?.grupoCaja.codigo,
    );
    if (existe) {
      this.snackBar.open('Ya existe una caja con ese nombre en este grupo', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const esNuevo = this.selectedRow!.codigo === 0;

    const payload = {
      codigo: esNuevo ? undefined : this.selectedRow!.codigo,
      nombre: nombre,
      grupoCaja: { codigo: this.selectedRow!.grupoCaja.codigo },
      planCuenta: { codigo: this.selectedRow!.planCuenta.codigo },
      fechaIngreso: esNuevo ? new Date().toISOString() : this.selectedRow!.fechaIngreso,
      estado: this.selectedRow!.estado,
    };

    this.loading.set(true);

    const operacion = esNuevo
      ? this.cajaLogicaService.add(payload)
      : this.cajaLogicaService.update(payload);

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
        this.cargarCajasPorGrupo(this.grupoSeleccionado!);
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

  limpiar(): void {
    this.grupoSeleccionado = null;
    this.dataSource.data = [];
    this.selectedRow = null;
    this.editMode.set(false);
    this.cargarGrupos();
  }

  seleccionarFila(row: CajaLogica): void {
    if (this.editMode()) {
      return;
    }
    this.selectedRow = row;
  }

  isSelected(row: CajaLogica): boolean {
    return this.selectedRow?.codigo === row.codigo;
  }

  isEditing(row: CajaLogica): boolean {
    return this.editMode() && this.selectedRow?.codigo === row.codigo;
  }

  getEstadoTexto(estado: number): string {
    return estado === this.ESTADO_ACTIVO ? 'ACTIVO' : 'INACTIVO';
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA);
  }

  getNombrePlanCuenta(planCuenta: PlanCuenta): string {
    if (!planCuenta || !planCuenta.codigo) return '';
    return `${planCuenta.cuentaContable} - ${planCuenta.nombre}`;
  }

  comparePlanCuenta(p1: PlanCuenta, p2: PlanCuenta): boolean {
    return p1 && p2 ? p1.codigo === p2.codigo : p1 === p2;
  }
}
