import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { DetallePlantilla } from '../../model/detalle-plantilla';
import { EstadoPlantilla, Plantilla } from '../../model/plantilla-general';
import { DetallePlantillaService } from '../../service/detalle-plantilla.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { PlantillaService } from '../../service/plantilla.service';
import { ConfirmDeleteDetalleDialogComponent } from '../plantilla-general/confirm-delete-detalle-dialog.component';
import { DetallePlantillaDialogComponent } from '../plantilla-general/detalle-plantilla-dialog.component';

@Component({
  selector: 'app-plantilla-sistema',
  standalone: true,
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateY(0%)', opacity: 1 })),
      ]),
    ]),
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
    MatProgressSpinnerModule,
  ],
  templateUrl: './plantilla-sistema.component.html',
  styleUrls: ['./plantilla-sistema.component.scss'],
})
export class PlantillaSistemaComponent implements OnInit {
  // Enum expuesto para el template
  EstadoPlantilla = EstadoPlantilla;

  // Formulario maestro
  plantillaForm: FormGroup;

  // Datos maestro
  plantillas: Plantilla[] = [];
  plantillaSeleccionada: Plantilla | null = null;

  // Datos detalle
  dataSourceDetalles = new MatTableDataSource<DetallePlantilla>();
  displayedColumnsDetalles: string[] = [
    'codigoCuenta',
    'descripcion',
    'movimiento',
    'estado',
    'acciones',
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
    private router: Router,
    private funcionesDatosService: FuncionesDatosService
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
      estado: [EstadoPlantilla.ACTIVO, Validators.required],
      fechaInactivo: [null],
      fechaCreacion: [null],
    });
  }

  loadPlantillas(): void {
    this.loading = true;
    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);

    // Usar selectByCriteria para filtrar desde el backend
    const criterios = {
      empresa: { codigo: empresaCodigo },
      sistema: 1, // Solo plantillas de sistema
    };

    this.plantillaService.selectByCriteria(criterios).subscribe({
      next: (data: Plantilla[] | null) => {
        this.plantillas = data || [];
        console.log(
          `🔍 Plantillas de sistema cargadas para empresa ${empresaCodigo}: ${this.plantillas.length}`
        );
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
      },
    });
  }

  seleccionarPlantilla(plantilla: Plantilla): void {
    this.plantillaSeleccionada = plantilla;
    // Asegurar mayúsculas al cargar en formulario
    this.plantillaForm.patchValue({
      ...plantilla,
      nombre: plantilla.nombre?.toUpperCase() || '',
      observacion: plantilla.observacion?.toUpperCase() || '',
    });
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
      alterno: 0,
    });
    this.dataSourceDetalles.data = [];
    this.showMessage('Listo para crear nueva plantilla', 'info');
  }

  cargarDetalles(plantillaCodigo: number): void {
    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    console.log(
      `🔍 Cargando detalles para plantilla ${plantillaCodigo} (empresa ${empresaCodigo})...`
    );
    this.detallePlantillaService.getByParent(plantillaCodigo).subscribe({
      next: (detalles: DetallePlantilla[] | null) => {
        const detallesFiltrados = (detalles || []).sort((a, b) => a.codigo - b.codigo);
        console.log(
          `✅ Detalles cargados para empresa ${empresaCodigo}: ${detallesFiltrados.length}`
        );
        this.dataSourceDetalles.data = detallesFiltrados;
      },
      error: (error) => {
        console.error('❌ Error al cargar detalles:', error);
        this.dataSourceDetalles.data = [];
      },
    });
  }

  guardarPlantilla(): void {
    console.log('🔵 [INICIO] guardarPlantilla() llamado');
    console.log('📋 Form valid:', this.plantillaForm.valid);
    console.log('📋 Form value:', this.plantillaForm.value);

    if (this.plantillaForm.invalid) {
      console.warn('⚠️ Formulario inválido, deteniendo guardado');
      this.markFormGroupTouched();
      this.showMessage('Complete todos los campos requeridos', 'warn');
      return;
    }

    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    const empresaNombre = localStorage.getItem('empresaName') || 'Empresa';
    console.log('🏢 Empresa:', { codigo: empresaCodigo, nombre: empresaNombre });

    const formValue = {
      ...this.plantillaForm.value,
      nombre: this.plantillaForm.value.nombre?.toUpperCase() || '',
      observacion: this.plantillaForm.value.observacion?.toUpperCase() || '',
      empresa: { codigo: empresaCodigo, nombre: empresaNombre } as any,
      sistema: 1, // PLNSSSTM - Indicador de sistema (1 para plantilla sistema)
    };

    // Eliminar codigo si es nuevo registro (el backend lo genera)
    if (this.isNewRecord && formValue.codigo === 0) {
      delete formValue.codigo;
      console.log('🆕 Registro nuevo, código eliminado para que el backend lo genere');
    }

    if (formValue.estado === 2 && !formValue.fechaInactivo) {
      this.plantillaForm.patchValue({
        fechaInactivo: new Date(),
      });
      console.log('📅 Estado inactivo, agregando fechaInactivo');
    } else if (formValue.estado === 1) {
      this.plantillaForm.patchValue({
        fechaInactivo: null,
      });
      console.log('📅 Estado activo, removiendo fechaInactivo');
    }

    console.log('📤 Datos a enviar:', formValue);
    console.log('🔄 Es nuevo registro:', this.isNewRecord);

    if (this.isNewRecord) {
      console.log('➕ Llamando a plantillaService.add()...');
      this.plantillaService.add(formValue).subscribe({
        next: (result) => {
          console.log('✅ Respuesta de add():', result);
          if (result) {
            this.showMessage('Plantilla creada correctamente', 'success');
            this.loadPlantillas();
            this.plantillaSeleccionada = result;
            // Asegurar mayúsculas al actualizar el formulario
            this.plantillaForm.patchValue({
              ...result,
              nombre: result.nombre?.toUpperCase() || '',
              observacion: result.observacion?.toUpperCase() || '',
            });
            this.isNewRecord = false;
            this.cancelarEdicion();
          } else {
            console.warn('⚠️ add() retornó null o undefined');
            this.showMessage('No se pudo crear la plantilla', 'warn');
          }
        },
        error: (error) => {
          console.error('❌ Error en add():', error);
          this.showMessage('Error al crear plantilla', 'error');
        },
      });
    } else {
      console.log('✏️ Llamando a plantillaService.update()...');
      this.plantillaService.update(formValue).subscribe({
        next: (result) => {
          console.log('✅ Respuesta de update():', result);
          if (result) {
            this.showMessage('Plantilla actualizada correctamente', 'success');
            this.loadPlantillas();
            this.plantillaSeleccionada = result;
            // Asegurar mayúsculas al actualizar el formulario
            this.plantillaForm.patchValue({
              ...result,
              nombre: result.nombre?.toUpperCase() || '',
              observacion: result.observacion?.toUpperCase() || '',
            });
          }
        },
        error: () => {
          this.showMessage('Error al actualizar plantilla', 'error');
        },
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
    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    console.log(`🔍 Cargando planes de cuenta para empresa ${empresaCodigo}...`);
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
        // Filtrar solo los planes de la empresa logueada
        const planesFiltrados = planes.filter(
          (plan) => plan.empresa && plan.empresa.codigo === empresaCodigo
        );
        console.log(`🔍 Planes filtrados para empresa ${empresaCodigo}: ${planesFiltrados.length}`);

        this.abrirDialogoConPlanes(planesFiltrados, detalleExistente);
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error al cargar planes de cuenta:', error);
        this.showMessage('Error al cargar planes de cuenta', 'error');
      },
    });
  }

  private abrirDialogoConPlanes(planCuentas: any[], detalleExistente?: DetallePlantilla): void {
    const dialogRef = this.dialog.open(DetallePlantillaDialogComponent, {
      width: '720px',
      data: { planCuentas, detalle: detalleExistente },
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
    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    const empresaNombre = localStorage.getItem('empresaName') || 'Empresa';

    const nuevoDetalle: any = {
      codigo: Date.now(),
      plantilla: {
        codigo: this.plantillaSeleccionada!.codigo,
        empresa: { codigo: empresaCodigo, nombre: empresaNombre },
      },
      planCuenta: result.planCuenta,
      descripcion: result.descripcion,
      movimiento: result.movimiento,
      // Formatear fechas para LocalDateTime (sin timezone)
      fechaDesde: this.funcionesDatosService.formatearFechaParaBackend(result.fechaDesde),
      fechaHasta: this.funcionesDatosService.formatearFechaParaBackend(result.fechaHasta),
      estado: result.estado,
      auxiliar1: 0,
      auxiliar2: 0,
      auxiliar3: 0,
      auxiliar4: 0,
      auxiliar5: 0,
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
      },
    });
  }

  private procesarEdicionDetalle(detalle: DetallePlantilla, result: any): void {
    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    const empresaNombre = localStorage.getItem('empresaName') || 'Empresa';

    const detalleActualizado: any = {
      ...detalle,
      ...result,
      // Formatear fechas para LocalDateTime (sin timezone)
      fechaDesde: this.funcionesDatosService.formatearFechaParaBackend(result.fechaDesde),
      fechaHasta: this.funcionesDatosService.formatearFechaParaBackend(result.fechaHasta),
      plantilla: {
        ...detalle.plantilla,
        empresa: { codigo: empresaCodigo, nombre: empresaNombre },
      },
      fechaInactivo:
        result.estado === 2
          ? this.funcionesDatosService.formatearFechaParaBackend(
              detalle.fechaInactivo || new Date()
            )
          : null,
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
        this.dataSourceDetalles.data = this.dataSourceDetalles.data.map((d) =>
          d.codigo === detalle.codigo ? (detalleActualizado as DetallePlantilla) : d
        );
        this.showMessage('Detalle actualizado (modo demo)', 'success');
      },
    });
  }

  editarDetalle(detalle: DetallePlantilla): void {
    this.cargarPlanesCuentaParaDialog(detalle);
  }

  eliminarDetalle(detalle: DetallePlantilla): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDetalleDialogComponent, {
      width: '380px',
      data: { descripcion: detalle.descripcion },
    });

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;

      const original = this.dataSourceDetalles.data;
      this.dataSourceDetalles.data = original.filter((d) => d.codigo !== detalle.codigo);

      const esPersistente =
        typeof detalle.codigo === 'number' &&
        detalle.codigo > 0 &&
        detalle.codigo < 9_000_000_000_000;
      if (!esPersistente) {
        this.showMessage('Detalle eliminado', 'info');
        return;
      }

      this.detallePlantillaService.delete(detalle.codigo).subscribe({
        next: () => this.showMessage('Detalle eliminado', 'success'),
        error: () => {
          this.dataSourceDetalles.data = original;
          this.showMessage('Error al eliminar. Se revierte el cambio.', 'error');
        },
      });
    });
  }

  duplicarDetalle(detalle: DetallePlantilla): void {
    const nuevoDetalle: DetallePlantilla = {
      ...detalle,
      codigo: Date.now(),
      descripcion: `${detalle.descripcion} (Copia)`,
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
    const totalDebe = detalles.filter((d) => d.movimiento === 1).length;
    const totalHaber = detalles.filter((d) => d.movimiento === 2).length;
    const diferencia = totalDebe - totalHaber;
    const balanceado = diferencia === 0;

    return {
      totalLineas,
      totalDebe,
      totalHaber,
      diferencia,
      balanceado,
    };
  }

  /**
   * Elimina una plantilla
   */
  eliminarPlantilla(): void {
    if (!this.plantillaSeleccionada) return;

    if (confirm(`¿Está seguro de eliminar la plantilla "${this.plantillaSeleccionada.nombre}"?`)) {
      this.plantillaService.delete(this.plantillaSeleccionada.codigo).subscribe({
        next: (result: Plantilla | null) => {
          if (result) {
            this.showMessage('Plantilla eliminada correctamente', 'success');
            this.loadPlantillas();
            this.isEditing = false;
            this.plantillaSeleccionada = null;
            this.plantillaForm.reset();
            this.dataSourceDetalles.data = [];
          }
        },
        error: (error: any) => {
          console.error('Error al eliminar plantilla:', error);
          this.showMessage('Error al eliminar plantilla', 'error');
        },
      });
    }
  }

  /**
   * Valida el estado actual de los detalles y muestra información
   */
  validarEstadoDetalles(): void {
    const detallesCount = this.dataSourceDetalles.data.length;
    const plantillaNombre =
      this.plantillaSeleccionada?.nombre || this.plantillaForm.get('nombre')?.value || 'Sin nombre';

    console.log('=== ESTADO DE DETALLES DE PLANTILLA ===');
    console.log(`Plantilla: ${plantillaNombre}`);
    console.log(`Código de plantilla: ${this.plantillaSeleccionada?.codigo || 'Sin guardar'}`);
    console.log(`Total de detalles: ${detallesCount}`);
    console.log(`Es nueva plantilla: ${this.isNewRecord}`);
    console.log('Detalles actuales:', this.dataSourceDetalles.data);

    if (this.isNewRecord) {
      this.showMessage(
        `Esta plantilla es nueva y tiene ${detallesCount} detalles pendientes de guardar`,
        'info'
      );
    } else if (this.plantillaSeleccionada?.codigo) {
      this.showMessage(`Plantilla guardada con ${detallesCount} detalles cargados`, 'success');
    } else {
      this.showMessage(`Estado inconsistente: plantilla sin código pero no es nueva`, 'warn');
    }
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
      detalles: detalles,
    };

    // Guardar en localStorage para usar en el componente de asientos
    localStorage.setItem('plantillaParaAsiento', JSON.stringify(plantillaData));

    this.showMessage('Navegando a crear asiento desde plantilla...', 'info');

    // Navegar al componente de asientos con parámetro
    this.router.navigate(['/menucontabilidad/asientos'], {
      queryParams: { plantilla: this.plantillaSeleccionada.codigo },
    });
  }

  cerrarBanner(): void {
    this.mostrarBannerDemo = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.plantillaForm.controls).forEach((key) => {
      const control = this.plantillaForm.get(key);
      control?.markAsTouched();
    });
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warn' | 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: [`snackbar-${type}`],
    });
  }

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
