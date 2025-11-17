import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { Periodo, EstadoPeriodo, FiltrosPeriodo, CrearPeriodo } from '../../model/periodo';
import { PeriodoService } from '../../service/periodo.service';

@Component({
  selector: 'app-periodos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatToolbarModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './periodos.component.html',
  styleUrls: ['./periodos.component.scss']
})
export class PeriodosComponent implements OnInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data source para la tabla
  dataSource = new MatTableDataSource<Periodo>([]);
  displayedColumns: string[] = ['codigo', 'nombre', 'mes', 'anio', 'estado', 'primerDia', 'ultimoDia', 'acciones'];

  // Formularios
  filtroForm!: FormGroup;
  crearPeriodoForm!: FormGroup;

  // Estados de la UI
  cargando = false;
  mostrarFormulario = false;
  editandoPeriodo = false;
  periodoSeleccionado: Periodo | null = null;

  // Opciones para selects
  aniosDisponibles: number[] = [];
  meses = [
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

  estados = [
    { valor: EstadoPeriodo.ABIERTO, nombre: 'Abierto' },
    { valor: EstadoPeriodo.MAYORIZADO, nombre: 'Mayorizado' },
    { valor: EstadoPeriodo.DESMAYORIZADO, nombre: 'Desmayorizado' }
  ];

  constructor(
    private periodoService: PeriodoService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.inicializarFormularios();
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarAniosDisponibles();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Configurar filtro personalizado
    this.dataSource.filterPredicate = (data: Periodo, filter: string) => {
      const searchString = filter.toLowerCase();
      return data.nombre.toLowerCase().includes(searchString) ||
             data.anio.toString().includes(searchString) ||
             this.periodoService.getNombreMes(data.mes).toLowerCase().includes(searchString) ||
             this.periodoService.getEstadoTexto(data.estado).toLowerCase().includes(searchString);
    };
  }

  /**
   * Inicializa los formularios reactivos
   */
  inicializarFormularios(): void {
    // Formulario de filtros
    this.filtroForm = this.fb.group({
      anio: [null],
      mes: [null],
      estado: [null],
      nombre: ['']
    });

    // Formulario para crear/editar período
    this.crearPeriodoForm = this.fb.group({
      mes: [null, [Validators.required, Validators.min(1), Validators.max(12)]],
      anio: [new Date().getFullYear(), [Validators.required, Validators.min(2020)]],
      nombre: ['']
    });

    // Suscribirse a cambios en filtros
    this.filtroForm.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });
  }

  /**
   * Carga los datos iniciales
   */
  cargarDatos(): void {
    this.cargando = true;
    this.periodoService.getAll().subscribe({
      next: (periodos) => {
        this.dataSource.data = periodos || [];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar períodos:', error);
        this.mostrarMensaje('Error al cargar los períodos', 'error');
        this.cargando = false;
      }
    });
  }

  /**
   * Carga los años disponibles
   */
  cargarAniosDisponibles(): void {
    this.periodoService.getAniosDisponibles().subscribe({
      next: (anios) => {
        this.aniosDisponibles = anios;
      },
      error: (error) => {
        console.error('Error al cargar años:', error);
      }
    });
  }

  /**
   * Aplica los filtros a los datos
   */
  aplicarFiltros(): void {
    const filtros = this.filtroForm.value as FiltrosPeriodo;

    if (this.todosFiltrosVacios(filtros)) {
      this.cargarDatos();
      return;
    }

    this.cargando = true;
    this.periodoService.selectByCriteria(filtros).subscribe({
      next: (periodos) => {
        this.dataSource.data = periodos || [];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al filtrar períodos:', error);
        this.mostrarMensaje('Error al filtrar los períodos', 'error');
        this.cargando = false;
      }
    });
  }

  /**
   * Verifica si todos los filtros están vacíos
   */
  todosFiltrosVacios(filtros: FiltrosPeriodo): boolean {
    return !filtros.anio && !filtros.mes && filtros.estado === null && !filtros.nombre;
  }

  /**
   * Aplicar filtro de búsqueda rápida
   */
  aplicarFiltroRapido(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtroForm.reset();
    this.dataSource.filter = '';
    this.cargarDatos();
  }

  /**
   * Mostrar formulario para nuevo período
   */
  nuevoPeriodo(): void {
    this.editandoPeriodo = false;
    this.periodoSeleccionado = null;
    this.crearPeriodoForm.reset({
      anio: new Date().getFullYear()
    });
    this.mostrarFormulario = true;
  }

  /**
   * Editar período existente
   */
  editarPeriodo(periodo: Periodo): void {
    this.editandoPeriodo = true;
    this.periodoSeleccionado = periodo;
    this.crearPeriodoForm.patchValue({
      mes: periodo.mes,
      anio: periodo.anio,
      nombre: periodo.nombre
    });
    this.mostrarFormulario = true;
  }

  /**
   * Guardar período (crear o actualizar)
   */
  guardarPeriodo(): void {
    if (this.crearPeriodoForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    const formValue = this.crearPeriodoForm.value;

    // Validar si ya existe el período
    this.periodoService.validarCreacionPeriodo(formValue.mes, formValue.anio).subscribe({
      next: (validacion) => {
        if (!validacion.valido && !this.editandoPeriodo) {
          this.mostrarMensaje(validacion.mensaje || 'Período inválido', 'warning');
          return;
        }

        const datosPeriodo: CrearPeriodo = {
          mes: formValue.mes,
          anio: formValue.anio,
          nombre: formValue.nombre || this.generarNombrePeriodo(formValue.mes, formValue.anio)
        };

        this.cargando = true;
        this.periodoService.crearPeriodo(datosPeriodo).subscribe({
          next: (periodo) => {
            if (periodo) {
              this.mostrarMensaje('Período creado exitosamente', 'success');
              this.cancelarFormulario();
              this.cargarDatos();
            }
          },
          error: (error) => {
            console.error('Error al crear período:', error);
            this.mostrarMensaje('Error al crear el período', 'error');
            this.cargando = false;
          }
        });
      }
    });
  }

  /**
   * Mayorizar período
   */
  mayorizarPeriodo(periodo: Periodo): void {
    if (periodo.estado !== EstadoPeriodo.ABIERTO) {
      this.mostrarMensaje('Solo se pueden mayorizar períodos abiertos', 'warning');
      return;
    }

    this.cargando = true;
    this.periodoService.mayorizar(periodo.codigo).subscribe({
      next: (exito) => {
        if (exito) {
          this.mostrarMensaje('Período mayorizado exitosamente', 'success');
          this.cargarDatos();
        } else {
          this.mostrarMensaje('No se pudo mayorizar el período', 'error');
          this.cargando = false;
        }
      },
      error: (error) => {
        console.error('Error al mayorizar período:', error);
        this.mostrarMensaje('Error al mayorizar el período', 'error');
        this.cargando = false;
      }
    });
  }

  /**
   * Desmayorizar período
   */
  desmayorizarPeriodo(periodo: Periodo): void {
    if (periodo.estado !== EstadoPeriodo.MAYORIZADO) {
      this.mostrarMensaje('Solo se pueden desmayorizar períodos mayorizados', 'warning');
      return;
    }

    this.cargando = true;
    this.periodoService.desmayorizar(periodo.codigo).subscribe({
      next: (exito) => {
        if (exito) {
          this.mostrarMensaje('Período desmayorizado exitosamente', 'success');
          this.cargarDatos();
        } else {
          this.mostrarMensaje('No se pudo desmayorizar el período', 'error');
          this.cargando = false;
        }
      },
      error: (error) => {
        console.error('Error al desmayorizar período:', error);
        this.mostrarMensaje('Error al desmayorizar el período', 'error');
        this.cargando = false;
      }
    });
  }

  /**
   * Eliminar período
   */
  eliminarPeriodo(periodo: Periodo): void {
    if (periodo.estado !== EstadoPeriodo.ABIERTO) {
      this.mostrarMensaje('Solo se pueden eliminar períodos abiertos', 'warning');
      return;
    }

    if (confirm(`¿Está seguro de eliminar el período ${periodo.nombre}?`)) {
      this.cargando = true;
      this.periodoService.delete(periodo.codigo).subscribe({
        next: (exito) => {
          if (exito) {
            this.mostrarMensaje('Período eliminado exitosamente', 'success');
            this.cargarDatos();
          } else {
            this.mostrarMensaje('No se pudo eliminar el período', 'error');
            this.cargando = false;
          }
        },
        error: (error) => {
          console.error('Error al eliminar período:', error);
          this.mostrarMensaje('Error al eliminar el período', 'error');
          this.cargando = false;
        }
      });
    }
  }

  /**
   * Cancelar formulario
   */
  cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.editandoPeriodo = false;
    this.periodoSeleccionado = null;
    this.crearPeriodoForm.reset();
    this.cargando = false;
  }

  /**
   * Marcar todos los campos como tocados para mostrar errores
   */
  marcarCamposComoTocados(): void {
    Object.keys(this.crearPeriodoForm.controls).forEach(key => {
      this.crearPeriodoForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Genera un nombre automático para el período
   */
  generarNombrePeriodo(mes: number, anio: number): string {
    return `${this.periodoService.getNombreMes(mes)} ${anio}`;
  }

  /**
   * Obtiene el nombre del mes
   */
  getNombreMes(mes: number): string {
    return this.periodoService.getNombreMes(mes);
  }

  /**
   * Obtiene el texto del estado
   */
  getEstadoTexto(estado: EstadoPeriodo): string {
    return this.periodoService.getEstadoTexto(estado);
  }

  /**
   * Obtiene la clase CSS para el badge del estado
   */
  getEstadoBadgeClass(estado: EstadoPeriodo): string {
    return this.periodoService.getEstadoBadgeClass(estado);
  }

  /**
   * Verifica si se puede mayorizar un período
   */
  puedeMyorizar(periodo: Periodo): boolean {
    return periodo.estado === EstadoPeriodo.ABIERTO;
  }

  /**
   * Verifica si se puede desmayorizar un período
   */
  puedeDesmayorizar(periodo: Periodo): boolean {
    return periodo.estado === EstadoPeriodo.MAYORIZADO;
  }

  /**
   * Verifica si se puede eliminar un período
   */
  puedeEliminar(periodo: Periodo): boolean {
    return periodo.estado === EstadoPeriodo.ABIERTO;
  }

  /**
   * Muestra mensaje al usuario
   */
  mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: `snackbar-${tipo}`,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  /**
   * Actualizar nombre automático cuando cambian mes/año
   */
  onMesAnioChange(): void {
    const mes = this.crearPeriodoForm.get('mes')?.value;
    const anio = this.crearPeriodoForm.get('anio')?.value;

    if (mes && anio && !this.crearPeriodoForm.get('nombre')?.value) {
      this.crearPeriodoForm.patchValue({
        nombre: this.generarNombrePeriodo(mes, anio)
      });
    }
  }
}
