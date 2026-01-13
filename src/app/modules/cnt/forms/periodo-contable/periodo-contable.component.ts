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
import { ConfirmDialogComponent } from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';

import { EstadoPeriodo, Periodo } from '../../model/periodo';
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
    MatCheckboxModule,
  ],
  templateUrl: './periodo-contable.component.html',
  styleUrl: './periodo-contable.component.scss',
})
export class PeriodoContableComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Datos principales
  periodos: Periodo[] = [];
  dataSource = new MatTableDataSource<Periodo>();
  displayedColumns: string[] = ['anio', 'mes', 'nombre', 'periodoCierre', 'estado', 'acciones'];

  // Formulario
  periodoForm: FormGroup;
  isEditing = false;
  isNewRecord = false;
  periodoSeleccionado: Periodo | null = null;

  // Estados
  loading = false;

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
    { valor: 12, nombre: 'Diciembre' },
  ];

  estadosDisponibles = [
    { valor: EstadoPeriodo.ABIERTO, nombre: 'Abierto' },
    { valor: EstadoPeriodo.MAYORIZADO, nombre: 'Mayorizado' },
    { valor: EstadoPeriodo.DESMAYORIZADO, nombre: 'Desmayorizado' },
  ];

  constructor(
    private fb: FormBuilder,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
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
      anio: [
        new Date().getFullYear(),
        [
          Validators.required,
          Validators.min(2000),
          Validators.max(2100),
          Validators.pattern(/^[0-9]{4}$/),
        ],
      ],
      nombre: [''],
      estado: [EstadoPeriodo.ABIERTO, Validators.required],
      periodoCierre: [false],
      primerDia: [null],
      ultimoDia: [null],
    });
  }

  initializeDataSource(): void {
    this.dataSource.filterPredicate = (data: Periodo, filter: string) => {
      const searchText = filter.toLowerCase();
      return (
        data.nombre.toLowerCase().includes(searchText) ||
        data.anio.toString().includes(searchText) ||
        data.mes.toString().includes(searchText)
      );
    };
  }

  generateAniosDisponibles(): void {
    const anioActual = new Date().getFullYear();
    this.aniosDisponibles = [];
    // Generar hasta 10 años en el futuro para permitir planificación a largo plazo
    for (let i = anioActual + 10; i >= 2020; i--) {
      this.aniosDisponibles.push(i);
    }
  }

  loadPeriodos(): void {
    this.loading = true;
    const empresaCodigo = localStorage.getItem('idSucursal');

    if (!empresaCodigo) {
      this.loading = false;
      this.showMessage('No hay empresa seleccionada. Por favor inicie sesión nuevamente.', 'error');
      console.error('❌ No se encontró idSucursal en localStorage');
      return;
    }

    console.log(`🔍 Cargando períodos contables para empresa ${empresaCodigo}...`);

    this.periodoService.getAll().subscribe({
      next: (data: Periodo[]) => {
        this.periodos = data || [];
        console.log(`✅ Períodos cargados: ${this.periodos.length}`);

        // Ordenar por año y mes descendente
        this.dataSource.data = this.periodos.sort((a, b) => {
          if (a.anio !== b.anio) {
            return b.anio - a.anio;
          }
          return b.mes - a.mes;
        });

        this.loading = false;

        if (this.periodos.length > 0) {
          this.showMessage('Períodos cargados correctamente', 'success');
        }
      },
      error: (error: any) => {
        console.error('❌ Error al cargar períodos:', error);
        this.showMessage('Error al cargar períodos. Verifique la conexión.', 'error');
        this.loading = false;
      },
    });
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
      periodoCierre: false,
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

    // Obtener código de empresa desde localStorage
    const empresaCodigoStr = localStorage.getItem('idSucursal');

    if (!empresaCodigoStr) {
      this.showMessage('No hay empresa seleccionada. Por favor inicie sesión nuevamente.', 'error');
      console.error('❌ No se encontró idSucursal en localStorage');
      return;
    }

    const empresaCodigo = parseInt(empresaCodigoStr, 10);

    const formValue = {
      ...this.periodoForm.value,
      // Al editar, mantener la empresa original; al crear, usar la de localStorage
      empresa: this.isNewRecord
        ? { codigo: empresaCodigo }
        : this.periodoSeleccionado?.empresa || { codigo: empresaCodigo },
    };

    // Eliminar codigo si es nuevo registro (el backend lo genera)
    if (this.isNewRecord && formValue.codigo === 0) {
      delete formValue.codigo;
    }

    // Generar nombre automático basado en mes y año actuales
    // Si es edición y cambió el mes o año, regenerar el nombre
    const nombreMes = this.mesesDisponibles.find((m) => m.valor === formValue.mes)?.nombre || '';
    const nombreEsperado = `${nombreMes} ${formValue.anio}`;

    if (!formValue.nombre || formValue.nombre !== nombreEsperado) {
      formValue.nombre = nombreEsperado;
    }

    // Calcular fechas del período
    const primerDia = new Date(formValue.anio, formValue.mes - 1, 1);
    const ultimoDia = new Date(formValue.anio, formValue.mes, 0);
    formValue.primerDia = primerDia;
    formValue.ultimoDia = ultimoDia;

    if (this.isNewRecord) {
      // Validar que no exista el período
      const existePeriodo = this.periodos.some(
        (p) => p.mes === formValue.mes && p.anio === formValue.anio
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
        },
      });
    } else {
      console.log('📤 Actualizando período:', formValue);

      this.periodoService.update(formValue).subscribe({
        next: (periodoActualizado) => {
          if (periodoActualizado) {
            console.log('✅ Período actualizado exitosamente');
            this.showMessage('Período actualizado correctamente', 'success');
            this.loadPeriodos();
            this.cancelarEdicion();
          } else {
            this.showMessage('No se pudo actualizar el período', 'error');
          }
        },
        error: (error) => {
          console.error('❌ Error al actualizar período:', error);
          this.showMessage('Error al actualizar período', 'error');
        },
      });
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
      },
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
      },
    });
  }

  eliminarPeriodo(periodo: Periodo): void {
    if (periodo.estado !== EstadoPeriodo.ABIERTO) {
      this.showMessage('Solo se pueden eliminar períodos abiertos', 'warn');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar Período',
        message: `¿Está seguro de eliminar el período ${periodo.nombre}?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'danger',
        details: [
          { label: 'Año', value: periodo.anio.toString() },
          { label: 'Mes', value: this.getNombreMes(periodo.mes) },
          { label: 'Estado', value: this.getEstadoTexto(periodo.estado) },
        ],
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
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
          },
        });
      }
    });
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
    Object.keys(this.periodoForm.controls).forEach((key) => {
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
          return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
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
      verticalPosition: 'top',
    });
  }
}
