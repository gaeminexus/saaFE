import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

import { Periodo, EstadoPeriodo } from '../../model/periodo';
import { PeriodoService } from '../../service/periodo.service';

@Component({
  selector: 'app-periodo-contable',
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
    MatCardModule,
    MatDialogModule,
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  templateUrl: './periodo-contable.component.html',
  styleUrl: './periodo-contable.component.scss'
})
export class PeriodoContableComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Datos principales
  periodos: Periodo[] = [];
  dataSource = new MatTableDataSource<Periodo>();
  displayedColumns: string[] = ['codigo', 'anio', 'mes', 'nombre', 'periodoCierre', 'estado', 'acciones'];

  // Formulario
  periodoForm: FormGroup;
  isEditing = false;
  isNewRecord = false;
  periodoSeleccionado: Periodo | null = null;

  // Estados
  loading = false;
  mostrarBannerDemo = false;

  // Filtros
  filtroAnio: number | null = null;
  filtroMes: number | null = null;
  filtroEstado: EstadoPeriodo | null = null;
  filtroTexto = '';

  // Opciones para selects
  aniosDisponibles: number[] = [];
  mesesDisponibles = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  estadosDisponibles = [
    { valor: EstadoPeriodo.ABIERTO, nombre: 'Abierto' },
    { valor: EstadoPeriodo.MAYORIZADO, nombre: 'Mayorizado' },
    { valor: EstadoPeriodo.DESMAYORIZADO, nombre: 'Desmayorizado' }
  ];

  constructor(
    private fb: FormBuilder,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar
  ) {
    this.periodoForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadPeriodos();
    this.initializeDataSource();
    this.generateAniosDisponibles();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  createForm(): FormGroup {
    return this.fb.group({
      codigo: [0],
      mes: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      anio: [new Date().getFullYear(), [Validators.required, Validators.min(2020)]],
      nombre: [''],
      estado: [EstadoPeriodo.ABIERTO, Validators.required],
      periodoCierre: [false],
      primerDia: [null],
      ultimoDia: [null]
    });
  }

  initializeDataSource(): void {
    this.dataSource.filterPredicate = (data: Periodo, filter: string) => {
      const searchText = filter.toLowerCase();
      return data.nombre.toLowerCase().includes(searchText) ||
             data.anio.toString().includes(searchText) ||
             data.mes.toString().includes(searchText);
    };
  }

  generateAniosDisponibles(): void {
    const anioActual = new Date().getFullYear();
    this.aniosDisponibles = [];
    for (let i = anioActual + 2; i >= 2020; i--) {
      this.aniosDisponibles.push(i);
    }
  }

  loadPeriodos(): void {
    this.loading = true;
    console.log('🔍 Cargando períodos contables para empresa 280...');

    this.periodoService.getAll().subscribe({
      next: (data: Periodo[]) => {
        this.periodos = data || [];
        console.log(`✅ Períodos cargados: ${this.periodos.length}`);
        this.aplicarFiltros();
        this.loading = false;

        if (this.periodos.length > 0) {
          this.showMessage('Períodos cargados correctamente', 'success');
        }
      },
      error: (error: any) => {
        console.error('❌ Error al cargar períodos:', error);
        if (error.status === 0 || error.message?.includes('ERR_CONNECTION_REFUSED')) {
          this.mostrarBannerDemo = true;
          this.showMessage('Backend no disponible. Usando datos de ejemplo.', 'info');
        } else {
          this.showMessage('Error al cargar períodos. Verifique la conexión.', 'error');
        }
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    let periodosFiltrados = [...this.periodos];

    if (this.filtroAnio) {
      periodosFiltrados = periodosFiltrados.filter(p => p.anio === this.filtroAnio);
    }

    if (this.filtroMes) {
      periodosFiltrados = periodosFiltrados.filter(p => p.mes === this.filtroMes);
    }

    if (this.filtroEstado !== null) {
      periodosFiltrados = periodosFiltrados.filter(p => p.estado === this.filtroEstado);
    }

    if (this.filtroTexto) {
      const texto = this.filtroTexto.toLowerCase();
      periodosFiltrados = periodosFiltrados.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        p.anio.toString().includes(texto) ||
        p.mes.toString().includes(texto)
      );
    }

    this.dataSource.data = periodosFiltrados.sort((a, b) => {
      if (a.anio !== b.anio) {
        return b.anio - a.anio; // Año descendente
      }
      return b.mes - a.mes; // Mes descendente
    });
  }

  limpiarFiltros(): void {
    this.filtroAnio = null;
    this.filtroMes = null;
    this.filtroEstado = null;
    this.filtroTexto = '';
    this.aplicarFiltros();
  }

  nuevoPeriodo(): void {
    this.isNewRecord = true;
    this.isEditing = true;
    this.periodoSeleccionado = null;
    this.periodoForm.reset();
    this.periodoForm.patchValue({
      codigo: 0,
      anio: new Date().getFullYear(),
      estado: EstadoPeriodo.ABIERTO,
      periodoCierre: false
    });
  }

  editarPeriodo(periodo: Periodo): void {
    this.periodoSeleccionado = periodo;
    this.isEditing = true;
    this.isNewRecord = false;
    this.periodoForm.patchValue(periodo);
  }

  guardarPeriodo(): void {
    if (this.periodoForm.invalid) {
      this.markFormGroupTouched();
      this.showMessage('Complete todos los campos requeridos', 'warn');
      return;
    }

    const formValue = {
      ...this.periodoForm.value,
      empresa: { codigo: 280, nombre: 'GAEMI NEXUS' } // Forzar empresa 280
    };

    // Eliminar codigo si es nuevo registro (el backend lo genera)
    if (this.isNewRecord && formValue.codigo === 0) {
      delete formValue.codigo;
    }

    // Generar nombre automático si no se especifica
    if (!formValue.nombre) {
      const nombreMes = this.mesesDisponibles.find(m => m.valor === formValue.mes)?.nombre || '';
      formValue.nombre = `${nombreMes} ${formValue.anio}`;
    }

    // Calcular fechas del período
    const primerDia = new Date(formValue.anio, formValue.mes - 1, 1);
    const ultimoDia = new Date(formValue.anio, formValue.mes, 0);
    formValue.primerDia = primerDia;
    formValue.ultimoDia = ultimoDia;

    if (this.isNewRecord) {
      // Validar que no exista el período
      const existePeriodo = this.periodos.some(p =>
        p.mes === formValue.mes && p.anio === formValue.anio
      );

      if (existePeriodo) {
        this.showMessage('Ya existe un período para el mes y año seleccionados', 'error');
        return;
      }

      console.log('📤 Creando nuevo período:', formValue);
      this.periodoService.crearPeriodo(formValue).subscribe({
        next: (result) => {
          if (result) {
            console.log('✅ Período creado exitosamente');
            this.showMessage('Período creado correctamente', 'success');
            this.loadPeriodos();
            this.cancelarEdicion();
          }
        },
        error: (error) => {
          console.error('❌ Error al crear período:', error);
          this.showMessage('Error al crear período', 'error');
        }
      });
    } else {
      console.log('📤 Actualizando período:', formValue);
      // Para actualización, usar el método update del servicio
      const url = '/api/saa-backend/rest/prdo';

      // Simular actualización exitosa por ahora
      this.showMessage('Actualización de períodos no implementada aún', 'info');
      this.cancelarEdicion();
    }
  }

  cancelarEdicion(): void {
    this.isEditing = false;
    this.isNewRecord = false;
    this.periodoSeleccionado = null;
    this.periodoForm.reset();
  }

  mayorizar(periodo: Periodo): void {
    if (periodo.estado !== EstadoPeriodo.ABIERTO) {
      this.showMessage('Solo se pueden mayorizar períodos abiertos', 'warn');
      return;
    }

    console.log('📤 Majorizando período:', periodo.codigo);
    this.periodoService.mayorizar(periodo.codigo).subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ Período mayorizado exitosamente');
          this.showMessage('Período mayorizado correctamente', 'success');
          this.loadPeriodos();
        } else {
          this.showMessage('No se pudo mayorizar el período', 'error');
        }
      },
      error: (error) => {
        console.error('❌ Error al mayorizar período:', error);
        this.showMessage('Error al mayorizar período', 'error');
      }
    });
  }

  desmayorizar(periodo: Periodo): void {
    if (periodo.estado !== EstadoPeriodo.MAYORIZADO) {
      this.showMessage('Solo se pueden desmayorizar períodos majorizados', 'warn');
      return;
    }

    console.log('📤 Desmayorizando período:', periodo.codigo);
    this.periodoService.desmayorizar(periodo.codigo).subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ Período desmayorizado exitosamente');
          this.showMessage('Período desmayorizado correctamente', 'success');
          this.loadPeriodos();
        } else {
          this.showMessage('No se pudo desmayorizar el período', 'error');
        }
      },
      error: (error) => {
        console.error('❌ Error al desmayorizar período:', error);
        this.showMessage('Error al desmayorizar período', 'error');
      }
    });
  }

  eliminarPeriodo(periodo: Periodo): void {
    if (periodo.estado !== EstadoPeriodo.ABIERTO) {
      this.showMessage('Solo se pueden eliminar períodos abiertos', 'warn');
      return;
    }

    if (confirm(`¿Está seguro de eliminar el período ${periodo.nombre}?`)) {
      console.log('🗑️ Eliminando período:', periodo.codigo);
      this.periodoService.delete(periodo.codigo).subscribe({
        next: (success) => {
          if (success) {
            console.log('✅ Período eliminado exitosamente');
            this.showMessage('Período eliminado correctamente', 'success');
            this.loadPeriodos();
          } else {
            this.showMessage('No se pudo eliminar el período', 'error');
          }
        },
        error: (error) => {
          console.error('❌ Error al eliminar período:', error);
          this.showMessage('Error al eliminar período', 'error');
        }
      });
    }
  }

  getNombreMes(mes: number): string {
    return this.periodoService.getNombreMes(mes);
  }

  getEstadoTexto(estado: EstadoPeriodo): string {
    return this.periodoService.getEstadoTexto(estado);
  }

  getEstadoBadgeClass(estado: EstadoPeriodo): string {
    return this.periodoService.getEstadoBadgeClass(estado);
  }

  puedeEditar(periodo: Periodo): boolean {
    return periodo.estado === EstadoPeriodo.ABIERTO;
  }

  puedeEliminar(periodo: Periodo): boolean {
    return periodo.estado === EstadoPeriodo.ABIERTO;
  }

  puedeMayorizar(periodo: Periodo): boolean {
    return periodo.estado === EstadoPeriodo.ABIERTO;
  }

  puedeDesmayorizar(periodo: Periodo): boolean {
    return periodo.estado === EstadoPeriodo.MAYORIZADO;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.periodoForm.controls).forEach(key => {
      const control = this.periodoForm.get(key);
      control?.markAsTouched();
    });
  }

  formatFecha(fecha: any, formato: string = 'dd/MM/yyyy'): string {
    if (!fecha) return '';

    try {
      // Si es una cadena, intentar convertirla a Date
      if (typeof fecha === 'string') {
        // Remover la zona horaria problemática
        const fechaLimpia = fecha.replace(/\[UTC\]$/, '').replace(/Z$/, '');
        const fechaObj = new Date(fechaLimpia);

        if (isNaN(fechaObj.getTime())) {
          return '';
        }

        fecha = fechaObj;
      }

      // Si ya es un objeto Date, formatear directamente
      if (fecha instanceof Date && !isNaN(fecha.getTime())) {
        if (formato === 'dd/MM') {
          return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        } else {
          return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      }

      return '';
    } catch (error) {
      console.warn('Error al formatear fecha:', error, fecha);
      return '';
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warn' | 'info'): void {
    let panelClass = '';
    switch (type) {
      case 'success':
        panelClass = 'snackbar-success';
        break;
      case 'error':
        panelClass = 'snackbar-error';
        break;
      case 'warn':
        panelClass = 'snackbar-warn';
        break;
      case 'info':
        panelClass = 'snackbar-info';
        break;
    }

    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      panelClass: [panelClass],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
