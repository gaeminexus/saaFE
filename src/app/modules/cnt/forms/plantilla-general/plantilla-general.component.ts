import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';

import { Plantilla, EstadoPlantilla } from '../../model/plantilla-general';
import { DetallePlantilla, TipoMovimiento } from '../../model/detalle-plantilla-general';
import { PlantillaService } from '../../service/plantilla-general.service';
import { DetallePlantillaDialogComponent } from './detalle-plantilla-dialog.component';

@Component({
  selector: 'app-plantilla-general',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatCardModule,
    MatDialogModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './plantilla-general.component.html',
  styleUrls: ['./plantilla-general.component.scss']
})
export class PlantillaGeneralComponent implements OnInit {
  // Formulario maestro
  plantillaForm: FormGroup;

  // Datos maestro
  plantillas: Plantilla[] = [];
  plantillaSeleccionada: Plantilla | null = null;

  // Datos detalle
  dataSourceDetalles = new MatTableDataSource<DetallePlantilla>();
  displayedColumnsDetalles: string[] = [
    'codigoCuenta', 'descripcion', 'tipoMovimiento', 'fechas', 'estado', 'auxiliares', 'acciones'
  ];

  // Estados y configuraciones
  isEditing = false;
  isNewRecord = false;
  loading = false;
  filterValue = '';
  mostrarBannerDemo = false;

  // Enums
  EstadoPlantilla = EstadoPlantilla;
  TipoMovimiento = TipoMovimiento;

  @ViewChild('maestroPaginator') maestroPaginator!: MatPaginator;
  @ViewChild('detallesPaginator') detallesPaginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private fb: FormBuilder,
    private plantillaService: PlantillaService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.plantillaForm = this.createForm();
    // Inicializar dataSource con array vacío
    this.dataSourceDetalles.data = [];
  }

  ngOnInit(): void {
    this.loadPlantillas();
  }

  ngAfterViewInit(): void {
    if (this.detallesPaginator) {
      this.dataSourceDetalles.paginator = this.detallesPaginator;
    }
    if (this.sort) {
      this.dataSourceDetalles.sort = this.sort;
    }
  }

  /**
   * Crea el formulario reactivo para la plantilla
   */
  createForm(): FormGroup {
    return this.fb.group({
      codigo: [0],
      codigoAlterno: [''],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      estado: [EstadoPlantilla.ACTIVO, Validators.required],
      observacion: ['', Validators.maxLength(500)],
      fechaInactivo: [null],
      fechaCreacion: [null],
      fechaUpdate: [null],
      usuarioCreacion: [''],
      usuarioUpdate: ['']
    });
  }

  /**
   * Carga todas las plantillas
   */
  loadPlantillas(): void {
    this.loading = true;
    this.plantillaService.getAll().subscribe({
      next: (data: Plantilla[] | null) => {
        this.plantillas = data || [];
        this.loading = false;

        // Verificar si estamos usando datos mock
        if (this.plantillas.length > 0) {
          this.showMessage('Datos cargados correctamente', 'success');
        }
      },
      error: (error: any) => {
        console.error('Error al cargar plantillas:', error);

        // Mostrar mensaje más específico basado en el tipo de error
        if (error.status === 0 || error.message?.includes('ERR_CONNECTION_REFUSED')) {
          this.mostrarBannerDemo = true;
          this.showMessage('Backend no disponible. Usando datos de ejemplo para demostración.', 'info');
        } else {
          this.showMessage('Error al cargar plantillas. Verifique la conexión con el servidor.', 'error');
        }
        this.loading = false;
      }
    });
  }

  /**
   * Selecciona una plantilla del maestro
   */
  seleccionarPlantilla(plantilla: Plantilla): void {
    this.plantillaSeleccionada = plantilla;
    this.isEditing = true;
    this.isNewRecord = false;
    this.loadPlantillaCompleta(plantilla.codigo);
  }

  /**
   * Carga plantilla completa con detalles
   */
  loadPlantillaCompleta(codigo: number): void {
    this.loading = true;
    this.plantillaService.getPlantillaCompleta(codigo).subscribe({
      next: (data: {plantilla: Plantilla, detalles: DetallePlantilla[]} | null) => {
        if (data) {
          // Cargar datos al formulario
          this.plantillaForm.patchValue(data.plantilla);

          // Cargar detalles en la tabla
          this.dataSourceDetalles.data = data.detalles.sort((a: DetallePlantilla, b: DetallePlantilla) => a.codigo - b.codigo);

          // Se elimina el mensaje al seleccionar una plantilla para evitar notificaciones innecesarias
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar plantilla completa:', error);

        if (error.status === 0 || error.message?.includes('ERR_CONNECTION_REFUSED')) {
          this.showMessage('Backend no disponible. Los detalles mostrados son datos de ejemplo.', 'info');
        } else {
          this.showMessage('Error al cargar plantilla. Verifique la conexión con el servidor.', 'error');
        }
        this.loading = false;
      }
    });
  }

  /**
   * Inicia la creación de una nueva plantilla
   */
  nuevaPlantilla(): void {
    this.isNewRecord = true;
    this.isEditing = true;
    this.plantillaSeleccionada = null;
    this.plantillaForm.reset();
    this.plantillaForm.patchValue({
      codigo: 0,
      estado: EstadoPlantilla.ACTIVO,
      fechaCreacion: new Date(),
      usuarioCreacion: 'current-user'
    });
    this.dataSourceDetalles.data = [];
    this.showMessage('Listo para crear nueva plantilla', 'info');
  }

  /**
   * Guarda la plantilla (maestro y detalle)
   */
  guardarPlantilla(): void {
    if (this.plantillaForm.invalid) {
      this.markFormGroupTouched();
      this.showMessage('Por favor complete todos los campos requeridos', 'warn');
      return;
    }

    const formValue = this.plantillaForm.value;

    // Validar fecha de desactivación si el estado es inactivo
    if (formValue.estado === EstadoPlantilla.INACTIVO && !formValue.fechaInactivo) {
      this.plantillaForm.patchValue({
        fechaInactivo: new Date()
      });
    } else if (formValue.estado === EstadoPlantilla.ACTIVO) {
      this.plantillaForm.patchValue({
        fechaInactivo: null
      });
    }

    const plantillaData: Plantilla = {
      ...this.plantillaForm.value,
      fechaUpdate: new Date(),
      usuarioUpdate: 'current-user',
      // Forzar empresa 280 para alinearse con el alcance solicitado
      empresa: { codigo: 280, nombre: 'GAEMI NEXUS' } as any
    };

    if (this.isNewRecord) {
      plantillaData.fechaCreacion = new Date();
      plantillaData.usuarioCreacion = 'current-user';
    }

    this.loading = true;

    if (this.isNewRecord) {
      this.plantillaService.add(plantillaData).subscribe({
        next: (result: Plantilla | null) => {
          if (result) {
            this.showMessage('Plantilla creada correctamente', 'success');
            this.loadPlantillas();
            this.plantillaSeleccionada = result;
            this.plantillaForm.patchValue(result);
            this.isNewRecord = false;
          } else {
            this.showMessage('Error al crear la plantilla', 'error');
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error al crear plantilla:', error);
          this.showMessage('Error al guardar plantilla. Verifique la conexión con el servidor.', 'error');
          this.loading = false;
        }
      });
    } else {
      this.plantillaService.update(plantillaData).subscribe({
        next: (result: Plantilla | null) => {
          if (result) {
            this.showMessage('Plantilla actualizada correctamente', 'success');
            this.loadPlantillas();
            this.plantillaSeleccionada = result;
            this.plantillaForm.patchValue(result);
          } else {
            this.showMessage('Error al actualizar la plantilla', 'error');
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error al actualizar plantilla:', error);
          this.showMessage('Error al actualizar plantilla. Verifique la conexión con el servidor.', 'error');
          this.loading = false;
        }
      });
    }
  }

  /**
   * Cancela la edición actual
   */
  cancelarEdicion(): void {
    if (this.plantillaSeleccionada) {
      this.loadPlantillaCompleta(this.plantillaSeleccionada.codigo);
    } else {
      this.isEditing = false;
      this.isNewRecord = false;
      this.plantillaForm.reset();
      this.dataSourceDetalles.data = [];
    }
  }

  /**
   * Elimina una plantilla
   */
  eliminarPlantilla(): void {
    if (!this.plantillaSeleccionada) return;

    if (confirm(`¿Está seguro de eliminar la plantilla "${this.plantillaSeleccionada.nombre}"?`)) {
      this.plantillaService.delete(this.plantillaSeleccionada.codigo).subscribe({
        next: (success: boolean) => {
          if (success) {
            this.showMessage('Plantilla eliminada correctamente');
            this.loadPlantillas();
            this.isEditing = false;
            this.plantillaSeleccionada = null;
            this.plantillaForm.reset();
            this.dataSourceDetalles.data = [];
          }
        },
        error: (error: any) => {
          console.error('Error al eliminar plantilla:', error);
          this.showMessage('Error al eliminar plantilla');
        }
      });
    }
  }

  /**
   * Obtiene la clase CSS para el badge del estado
   */
  getEstadoBadgeClass(estado: EstadoPlantilla): string {
    switch (estado) {
      case EstadoPlantilla.ACTIVO:
        return 'badge-activo';
      case EstadoPlantilla.INACTIVO:
        return 'badge-inactivo';
      default:
        return 'badge-default';
    }
  }

  /**
   * Obtiene el texto del estado
   */
  getEstadoText(estado: EstadoPlantilla): string {
    switch (estado) {
      case EstadoPlantilla.ACTIVO:
        return 'Activo';
      case EstadoPlantilla.INACTIVO:
        return 'Inactivo';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Aplica filtro a la lista de plantillas
   */
  applyFilterMaestro(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    // Implementar filtro personalizado para plantillas
    this.filterPlantillas(filterValue);
  }

  private filterPlantillas(filter: string): void {
    if (!filter) {
      // Mostrar todas las plantillas
      this.loadPlantillas();
    } else {
      const filteredPlantillas = this.plantillas.filter(plantilla =>
        plantilla.nombre.toLowerCase().includes(filter.toLowerCase()) ||
        plantilla.codigo.toString().toLowerCase().includes(filter.toLowerCase())
      );
      this.plantillas = filteredPlantillas;
    }
  }

  /**
   * Aplica filtro a los detalles
   */
  applyFilterDetalles(): void {
    this.dataSourceDetalles.filter = this.filterValue.trim().toLowerCase();
  }

  /**
   * Calcula el resumen de la plantilla
   */
  calcularResumen(): any {
    const detalles = this.dataSourceDetalles.data;
    const totalLineas = detalles.length;

    let totalDebe = 0;
    let totalHaber = 0;

    detalles.forEach(detalle => {
      if (detalle.movimiento === TipoMovimiento.DEBE) {
        totalDebe += 1; // Solo contar líneas debe
      } else {
        totalHaber += 1; // Solo contar líneas haber
      }
    });

    return {
      totalLineas,
      totalDebe,
      totalHaber,
      diferencia: 0,
      balanceado: true
    };
  }

  /**
   * Marca todos los campos del formulario como touched
   */
  private markFormGroupTouched(): void {
    Object.keys(this.plantillaForm.controls).forEach(key => {
      this.plantillaForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Muestra mensaje al usuario usando snackbar
   */
  private showMessage(message: string, type: 'success' | 'error' | 'warn' | 'info' = 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: type === 'error' ? 7000 : 5000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // Métodos para gestión de detalles (se implementarán en componentes separados)
  agregarDetalle(): void {
    const planCuentas = this.plantillaService.getPlanCuentasDemo();
    const dialogRef = this.dialog.open(DetallePlantillaDialogComponent, {
      width: '720px',
      data: { planCuentas }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const nuevo: DetallePlantilla = {
          codigo: Date.now(),
          plantilla: this.plantillaSeleccionada || {
            codigo: 0,
            nombre: this.plantillaForm.get('nombre')?.value || 'Sin Nombre',
            estado: this.plantillaForm.get('estado')?.value,
            empresa: { codigo: 280, jerarquia: { codigo:1,nombre:'',nivel:1,codigoPadre:0,descripcion:'',ultimoNivel:1,rubroTipoEstructuraP:1,rubroTipoEstructuraH:1,codigoAlterno:1,rubroNivelCaracteristicaP:1,rubroNivelCaracteristicaH:1 }, nombre: 'GAEMI NEXUS', nivel:1, codigoPadre:0, ingresado:1 },
          } as any,
          planCuenta: result.planCuenta,
          descripcion: result.descripcion,
          movimiento: result.movimiento,
          fechaDesde: result.fechaDesde,
          fechaHasta: result.fechaHasta,
          auxiliar1: result.auxiliar1,
          auxiliar2: result.auxiliar2,
          auxiliar3: result.auxiliar3,
          auxiliar4: result.auxiliar4,
          auxiliar5: result.auxiliar5,
          estado: result.estado,
          fechaInactivo: result.estado === 2 ? new Date() : undefined
        };
        const data = [...this.dataSourceDetalles.data, nuevo];
        this.dataSourceDetalles.data = data;
        this.showMessage('Detalle agregado', 'success');
      }
    });
  }

  editarDetalle(detalle: DetallePlantilla): void {
    const planCuentas = this.plantillaService.getPlanCuentasDemo();
    const dialogRef = this.dialog.open(DetallePlantillaDialogComponent, {
      width: '720px',
      data: { planCuentas, detalle }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const actualizado: DetallePlantilla = {
          ...detalle,
          ...result,
          fechaInactivo: result.estado === 2 ? (detalle.fechaInactivo || new Date()) : undefined
        };
        this.dataSourceDetalles.data = this.dataSourceDetalles.data.map(d => d.codigo === detalle.codigo ? actualizado : d);
        this.showMessage('Detalle actualizado', 'success');
      }
    });
  }

  eliminarDetalle(detalle: DetallePlantilla): void {
    if (confirm(`¿Está seguro de eliminar el detalle "${detalle.descripcion}"?`)) {
      const detalles = this.dataSourceDetalles.data.filter(d => d.codigo !== detalle.codigo);
      this.dataSourceDetalles.data = detalles;
    }
  }

  duplicarDetalle(detalle: DetallePlantilla): void {
    const nuevoDetalle: DetallePlantilla = {
      ...detalle,
      codigo: Date.now(), // Código temporal
      descripcion: `${detalle.descripcion} (Copia)`
    };

    const detalles = [...this.dataSourceDetalles.data, nuevoDetalle];
    this.dataSourceDetalles.data = detalles;
    this.showMessage('Detalle duplicado', 'info');
  }

  /**
   * Crear asiento contable basado en la plantilla seleccionada
   */
  crearAsientoDesdeTemplate(): void {
    if (!this.plantillaSeleccionada) {
      this.showMessage('No hay plantilla seleccionada', 'warn');
      return;
    }

    const detalles = this.dataSourceDetalles.data;
    if (detalles.length === 0) {
      this.showMessage('La plantilla no tiene detalles para crear el asiento', 'warn');
      return;
    }

    // Preparar datos de la plantilla para el asiento
    const plantillaData = {
      plantillaCodigo: this.plantillaSeleccionada.codigo,
      plantillaNombre: this.plantillaSeleccionada.nombre,
      detalles: detalles
    };

    // Guardar en localStorage para usar en el componente de asientos
    localStorage.setItem('plantillaParaAsiento', JSON.stringify(plantillaData));

    this.showMessage('Navegando a crear asiento desde plantilla...', 'info');

    // Navegar al componente de asientos con parámetro
    this.router.navigate(['/menucontabilidad/asientos'], {
      queryParams: { plantilla: this.plantillaSeleccionada.codigo }
    });
  }

  /**
   * Cierra el banner de demostración
   */
  cerrarBanner(): void {
    this.mostrarBannerDemo = false;
  }
}
