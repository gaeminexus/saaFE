import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';

import { Plantilla } from '../../model/plantilla';
import { DetallePlantilla } from '../../model/detalle-plantilla';
import { PlantillaService } from '../../service/plantilla.service';
import { DetallePlantillaService } from '../../service/detalle-plantilla.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { DetallePlantillaDialogComponent } from '../plantilla-general/detalle-plantilla-dialog.component';
import { ConfirmDeleteDetalleDialogComponent } from '../plantilla-general/confirm-delete-detalle-dialog.component';

@Component({
  selector: 'app-plantilla-sistema',
  standalone: true,
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateY(0%)', opacity: 1 }))
      ])
    ])
  ],
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
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './plantilla-sistema.component.html',
  styleUrls: ['./plantilla-sistema.component.scss']
})
export class PlantillaSistemaComponent implements OnInit {
  // Formulario maestro
  plantillaForm: FormGroup;

  // Datos maestro
  plantillas: Plantilla[] = [];
  plantillaSeleccionada: Plantilla | null = null;

  // Datos detalle
  dataSourceDetalles = new MatTableDataSource<DetallePlantilla>();
  displayedColumnsDetalles: string[] = [
    'codigoCuenta', 'descripcion', 'movimiento', 'estado', 'acciones'
  ];

  // Estados y configuraciones
  isEditing = false;
  isNewRecord = false;
  loading = false;
  filterValue = '';
  mostrarBannerDemo = false;

  @ViewChild('maestroPaginator') maestroPaginator!: MatPaginator;
  @ViewChild('detallesPaginator') detallesPaginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private fb: FormBuilder,
    private plantillaService: PlantillaService,
    private detallePlantillaService: DetallePlantillaService,
    private planCuentaService: PlanCuentaService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.plantillaForm = this.createForm();
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

  createForm(): FormGroup {
    return this.fb.group({
      codigo: [0],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      alterno: [0],
      observacion: ['', Validators.maxLength(500)],
      estado: [1, Validators.required],
      fechaInactivo: [null]
    });
  }

  loadPlantillas(): void {
    this.loading = true;
    this.plantillaService.getAll().subscribe({
      next: (data: Plantilla[] | null) => {
        this.plantillas = data || [];
        console.log(`🔍 Plantillas cargadas para empresa 280: ${this.plantillas.length}`);
        this.loading = false;
        if (this.plantillas.length > 0) {
          this.showMessage('Plantillas cargadas correctamente', 'success');
        }
      },
      error: (error: any) => {
        console.error('Error al cargar plantillas:', error);
        if (error.status === 0 || error.message?.includes('ERR_CONNECTION_REFUSED')) {
          this.mostrarBannerDemo = true;
          this.showMessage('Backend no disponible. Usando datos de ejemplo.', 'info');
        } else {
          this.showMessage('Error al cargar plantillas. Verifique la conexión.', 'error');
        }
        this.loading = false;
      }
    });
  }

  seleccionarPlantilla(plantilla: Plantilla): void {
    this.plantillaSeleccionada = plantilla;
    this.plantillaForm.patchValue(plantilla);
    this.isEditing = true;
    this.isNewRecord = false;
    this.cargarDetalles(plantilla.codigo);
  }

  nuevaPlantilla(): void {
    this.isNewRecord = true;
    this.isEditing = true;
    this.plantillaSeleccionada = null;
    this.plantillaForm.reset();
    this.plantillaForm.patchValue({
      codigo: 0,
      estado: 1,
      alterno: 0
    });
    this.dataSourceDetalles.data = [];
    this.showMessage('Listo para crear nueva plantilla', 'info');
  }

  cargarDetalles(plantillaCodigo: number): void {
    console.log(`🔍 Cargando detalles para plantilla ${plantillaCodigo} (empresa 280)...`);
    this.detallePlantillaService.getByParent(plantillaCodigo).subscribe({
      next: (detalles: DetallePlantilla[] | null) => {
        const detallesFiltrados = (detalles || []).sort((a, b) => a.codigo - b.codigo);
        console.log(`✅ Detalles cargados para empresa 280: ${detallesFiltrados.length}`);
        this.dataSourceDetalles.data = detallesFiltrados;
      },
      error: (error) => {
        console.error('❌ Error al cargar detalles:', error);
        this.dataSourceDetalles.data = [];
      }
    });
  }

  guardarPlantilla(): void {
    if (this.plantillaForm.invalid) {
      this.markFormGroupTouched();
      this.showMessage('Complete todos los campos requeridos', 'warn');
      return;
    }

    const formValue = {
      ...this.plantillaForm.value,
      // Forzar empresa 280 para alinearse con el alcance solicitado
      empresa: { codigo: 280, nombre: 'GAEMI NEXUS' } as any
    };

    // Eliminar codigo si es nuevo registro (el backend lo genera)
    if (this.isNewRecord && formValue.codigo === 0) {
      delete formValue.codigo;
    }

    if (formValue.estado === 2 && !formValue.fechaInactivo) {
      this.plantillaForm.patchValue({
        fechaInactivo: new Date()
      });
    } else if (formValue.estado === 1) {
      this.plantillaForm.patchValue({
        fechaInactivo: null
      });
    }

    if (this.isNewRecord) {
      this.plantillaService.add(formValue).subscribe({
        next: (result) => {
          if (result) {
            this.showMessage('Plantilla creada correctamente', 'success');
            this.loadPlantillas();
            this.cancelarEdicion();
          }
        },
        error: () => {
          this.showMessage('Error al crear plantilla', 'error');
        }
      });
    } else {
      this.plantillaService.update(formValue).subscribe({
        next: (result) => {
          if (result) {
            this.showMessage('Plantilla actualizada correctamente', 'success');
            this.loadPlantillas();
          }
        },
        error: () => {
          this.showMessage('Error al actualizar plantilla', 'error');
        }
      });
    }
  }

  cancelarEdicion(): void {
    this.isEditing = false;
    this.isNewRecord = false;
    this.plantillaSeleccionada = null;
    this.plantillaForm.reset();
    this.dataSourceDetalles.data = [];
  }

  agregarDetalle(): void {
    this.cargarPlanesCuentaParaDialog();
  }

  private cargarPlanesCuentaParaDialog(detalleExistente?: DetallePlantilla): void {
    console.log('🔍 Cargando planes de cuenta para empresa 280...');
    this.loading = true;
    this.planCuentaService.getAll().subscribe({
      next: (planCuentas) => {
        this.loading = false;
        const planes = Array.isArray(planCuentas) ? planCuentas : [];

        if (planes.length === 0) {
          this.showMessage('No se encontraron planes de cuenta', 'warn');
          return;
        }

        console.log(`✅ Se cargaron ${planes.length} planes de cuenta del servidor`);
        // Filtrar solo los planes de la empresa 280
        const planesFiltrados = planes.filter(plan =>
          plan.empresa && plan.empresa.codigo === 280
        );
        console.log(`🔍 Planes filtrados para empresa 280: ${planesFiltrados.length}`);

        this.abrirDialogoConPlanes(planesFiltrados, detalleExistente);
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error al cargar planes de cuenta:', error);
        this.showMessage('Error al cargar planes de cuenta', 'error');
      }
    });
  }

  private abrirDialogoConPlanes(planCuentas: any[], detalleExistente?: DetallePlantilla): void {
    const dialogRef = this.dialog.open(DetallePlantillaDialogComponent, {
      width: '720px',
      data: { planCuentas, detalle: detalleExistente }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        if (detalleExistente) {
          this.procesarEdicionDetalle(detalleExistente, result);
        } else {
          this.procesarNuevoDetalle(result);
        }
      }
    });
  }

  private procesarNuevoDetalle(result: any): void {
    const nuevoDetalle = {
      codigo: Date.now(),
      plantilla: {
        codigo: this.plantillaSeleccionada!.codigo,
        empresa: { codigo: 280, nombre: 'GAEMI NEXUS' } // Forzar empresa 280
      },
      planCuenta: result.planCuenta,
      descripcion: result.descripcion,
      movimiento: result.movimiento,
      fechaDesde: result.fechaDesde,
      fechaHasta: result.fechaHasta,
      estado: result.estado,
      auxiliar1: 0,
      auxiliar2: 0,
      auxiliar3: 0,
      auxiliar4: 0,
      auxiliar5: 0
    };

    console.log('🔄 Agregando detalle al backend:', nuevoDetalle);
    this.detallePlantillaService.add(nuevoDetalle).subscribe({
      next: (result) => {
        console.log('✅ Detalle agregado exitosamente:', result);
        this.cargarDetalles(this.plantillaSeleccionada!.codigo);
        this.showMessage('Detalle agregado correctamente', 'success');
      },
      error: (error) => {
        console.error('❌ Error al agregar detalle, activando modo demo:', error);
        // Fallback: agregar solo en memoria
        const data = [...this.dataSourceDetalles.data, nuevoDetalle as DetallePlantilla];
        this.dataSourceDetalles.data = data;
        this.showMessage('Detalle agregado (modo demo)', 'info');
      }
    });
  }

  private procesarEdicionDetalle(detalle: DetallePlantilla, result: any): void {
    const detalleActualizado = {
      ...detalle,
      ...result,
      plantilla: {
        ...detalle.plantilla,
        empresa: { codigo: 280, nombre: 'GAEMI NEXUS' } // Mantener empresa 280
      },
      fechaInactivo: result.estado === 2 ? (detalle.fechaInactivo || new Date()) : null
    };

    console.log('🔄 Actualizando detalle en backend:', detalleActualizado);
    this.detallePlantillaService.update(detalleActualizado).subscribe({
      next: (result) => {
        console.log('✅ Detalle actualizado exitosamente:', result);
        this.cargarDetalles(this.plantillaSeleccionada!.codigo);
        this.showMessage('Detalle actualizado correctamente', 'success');
      },
      error: (error) => {
        console.error('❌ Error al actualizar detalle, activando modo demo:', error);
        // Fallback: actualizar en memoria
        this.dataSourceDetalles.data = this.dataSourceDetalles.data.map(d =>
          d.codigo === detalle.codigo ? detalleActualizado as DetallePlantilla : d
        );
        this.showMessage('Detalle actualizado (modo demo)', 'success');
      }
    });
  }

  editarDetalle(detalle: DetallePlantilla): void {
    this.cargarPlanesCuentaParaDialog(detalle);
  }

  eliminarDetalle(detalle: DetallePlantilla): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDetalleDialogComponent, {
      width: '380px',
      data: { descripcion: detalle.descripcion }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (!confirmado) return;

      const original = this.dataSourceDetalles.data;
      this.dataSourceDetalles.data = original.filter(d => d.codigo !== detalle.codigo);

      const esPersistente = typeof detalle.codigo === 'number' && detalle.codigo > 0 && detalle.codigo < 9_000_000_000_000;
      if (!esPersistente) {
        this.showMessage('Detalle eliminado', 'info');
        return;
      }

      this.detallePlantillaService.delete(detalle.codigo).subscribe({
        next: () => this.showMessage('Detalle eliminado', 'success'),
        error: () => {
          this.dataSourceDetalles.data = original;
          this.showMessage('Error al eliminar. Se revierte el cambio.', 'error');
        }
      });
    });
  }

  duplicarDetalle(detalle: DetallePlantilla): void {
    const nuevoDetalle: DetallePlantilla = {
      ...detalle,
      codigo: Date.now(),
      descripcion: `${detalle.descripcion} (Copia)`
    };

    const detalles = [...this.dataSourceDetalles.data, nuevoDetalle];
    this.dataSourceDetalles.data = detalles;
    this.showMessage('Detalle duplicado', 'info');
  }

  applyFilterMaestro(event: any): void {
    const filterValue = (event.target as HTMLInputElement).value;
    // Aquí implementarías el filtrado de plantillas maestro
    // Por simplicidad, no implementamos filtrado real aquí
  }

  applyFilterDetalles(): void {
    this.dataSourceDetalles.filter = this.filterValue.trim().toLowerCase();
  }

  calcularResumen() {
    const detalles = this.dataSourceDetalles.data;
    const totalLineas = detalles.length;
    const totalDebe = detalles.filter(d => d.movimiento === 1).length;
    const totalHaber = detalles.filter(d => d.movimiento === 2).length;
    const diferencia = totalDebe - totalHaber;
    const balanceado = diferencia === 0;

    return {
      totalLineas,
      totalDebe,
      totalHaber,
      diferencia,
      balanceado
    };
  }

  cerrarBanner(): void {
    this.mostrarBannerDemo = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.plantillaForm.controls).forEach(key => {
      const control = this.plantillaForm.get(key);
      control?.markAsTouched();
    });
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warn' | 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: [`snackbar-${type}`]
    });
  }

  getEstadoBadgeClass(estado: number): string {
    return estado === 1 ? 'badge-activo' : 'badge-inactivo';
  }

  getEstadoText(estado: number): string {
    return estado === 1 ? 'Activo' : 'Inactivo';
  }

  getPlanCuentaNombre(planCuenta: any): string {
    if (typeof planCuenta === 'object' && planCuenta?.nombre) {
      return planCuenta.nombre;
    }
    if (typeof planCuenta === 'string') {
      const parts = planCuenta.split(' - ');
      return parts.length > 1 ? parts.slice(1).join(' - ') : planCuenta;
    }
    return 'Sin nombre';
  }
}
