import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { catchError } from 'rxjs/operators';

import { Asiento, EstadoAsiento, FiltrosAsiento, CrearAsiento } from '../../model/asiento';
import { DetalleAsiento } from '../../model/detalle-asiento';
import { TipoAsiento } from '../../model/tipo-asiento';
import { Periodo } from '../../model/periodo';
import { PlanCuenta } from '../../model/plan-cuenta';
import { CentroCosto } from '../../model/centro-costo';

import { AsientoService } from '../../service/asiento.service';
import { TipoAsientoService } from '../../service/tipo-asiento.service';
import { PeriodoService } from '../../service/periodo.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { CentroCostoService } from '../../service/centro-costo.service';

@Component({
  selector: 'app-asientos',
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
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatExpansionModule,
    MatAutocompleteModule
  ],
  templateUrl: './asientos.component.html',
  styleUrls: ['./asientos.component.scss']
})
export class AsientosComponent implements OnInit {

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data sources
  dataSource = new MatTableDataSource<Asiento>([]);
  dataSourceDetalles = new MatTableDataSource<any>([]);

  displayedColumns: string[] = ['numero', 'fechaAsiento', 'tipoAsiento', 'observaciones', 'estado', 'totalDebe', 'totalHaber', 'acciones'];
  displayedColumnsDetalles: string[] = ['cuenta', 'descripcion', 'debe', 'haber', 'centroCosto', 'acciones'];

  // Formularios
  filtroForm!: FormGroup;
  asientoForm!: FormGroup;

  // Estados de la UI
  cargando = false;
  mostrarFormulario = false;
  editandoAsiento = false;
  asientoSeleccionado: Asiento | null = null;
  tabIndex = 0;

  // Datos para selects
  tiposAsiento: TipoAsiento[] = [];
  periodos: Periodo[] = [];
  cuentas: PlanCuenta[] = [];
  centrosCosto: CentroCosto[] = [];

  // Filtrados para autocomplete
  cuentasFiltradas: PlanCuenta[][] = [];
  centrosCostoFiltrados: CentroCosto[][] = [];

  // Estados
  estados = [
    { valor: EstadoAsiento.ACTIVO, nombre: 'Activo' },
    { valor: EstadoAsiento.ANULADO, nombre: 'Anulado' },
    { valor: EstadoAsiento.REVERSADO, nombre: 'Reversado' },
    { valor: EstadoAsiento.INCOMPLETO, nombre: 'Incompleto' }
  ];

  // Totales
  totalDebe = 0;
  totalHaber = 0;
  diferencia = 0;

  constructor(
    private asientoService: AsientoService,
    private tipoAsientoService: TipoAsientoService,
    private periodoService: PeriodoService,
    private planCuentaService: PlanCuentaService,
    private centroCostoService: CentroCostoService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {
    this.inicializarFormularios();
  }

  private readonly EMPRESA_CODIGO = 280;

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarTiposAsiento();
    this.cargarPeriodos();
    this.cargarCuentas();
    this.cargarCentrosCosto();

    // Verificar si se viene desde una plantilla
    this.verificarPlantilla();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Configurar filtro personalizado
    this.dataSource.filterPredicate = (data: Asiento, filter: string) => {
      const searchString = filter.toLowerCase();
      return data.numero.toString().includes(searchString) ||
             data.observaciones.toLowerCase().includes(searchString) ||
             data.tipoAsiento.nombre.toLowerCase().includes(searchString) ||
             this.asientoService.getEstadoTexto(data.estado).toLowerCase().includes(searchString);
    };
  }

  /**
   * Inicializa los formularios reactivos
   */
  inicializarFormularios(): void {
    // Formulario de filtros
    this.filtroForm = this.fb.group({
      fechaDesde: [null],
      fechaHasta: [null],
      tipoAsiento: [null],
      estado: [null],
      numero: [null],
      periodo: [null],
      observaciones: ['']
    });

    // Formulario principal de asiento
    this.asientoForm = this.fb.group({
      codigo: [null],
      tipoAsiento: [null, [Validators.required]],
      fechaAsiento: [new Date(), [Validators.required]],
      periodo: [null, [Validators.required]],
      observaciones: ['', [Validators.required, Validators.maxLength(200)]],
      detalles: this.fb.array([])
    });

    // Suscribirse a cambios en filtros
    this.filtroForm.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });
  }

  /**
   * Obtiene el FormArray de detalles
   */
  get detalles(): FormArray {
    return this.asientoForm.get('detalles') as FormArray;
  }

  /**
   * Crea un nuevo FormGroup para detalle
   */
  crearDetalleForm(): FormGroup {
    return this.fb.group({
      codigo: [null],
      planCuenta: [null, [Validators.required]],
      descripcion: ['', [Validators.required]],
      valorDebe: [0, [Validators.min(0)]],
      valorHaber: [0, [Validators.min(0)]],
      centroCosto: [null]
    });
  }

  /**
   * Carga los datos iniciales
   */
  cargarDatos(): void {
    this.cargando = true;

    // Priorizar selectByCriteria con fallback a getAll
    this.asientoService.selectByCriteria({}).pipe(
      catchError(err => {
        console.warn('selectByCriteria falló, intentando getAll como fallback:', err);
        return this.asientoService.getAll();
      })
    ).subscribe({
      next: (asientos) => {
        // Filtrar por empresa 280
        this.dataSource.data = (asientos || []).filter(a => a.empresa?.codigo === this.EMPRESA_CODIGO);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar asientos:', error);
        this.mostrarMensaje('Error al cargar los asientos', 'error');
        this.cargando = false;
      }
    });
  }

  /**
   * Carga los tipos de asiento
   */
  cargarTiposAsiento(): void {
    this.tipoAsientoService.getAll().subscribe({
      next: (tipos) => {
        // Filtrar por empresa 280
        this.tiposAsiento = (tipos || []).filter(t => t.empresa?.codigo === this.EMPRESA_CODIGO);
      },
      error: (error) => {
        console.error('Error al cargar tipos de asiento:', error);
        this.mostrarMensaje('Error al cargar tipos de asiento. Verifique la conexión con el servidor.', 'error');
        this.tiposAsiento = [];
      }
    });
  }

  /**
   * Carga los períodos
   */
  cargarPeriodos(): void {
    this.periodoService.getAll().subscribe({
      next: (periodos) => {
        this.periodos = periodos || [];
        // Seleccionar período actual por defecto
        this.periodoService.getPeriodoActual().subscribe({
          next: (actual) => {
            if (actual) {
              this.asientoForm.patchValue({ periodo: actual });
            }
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar períodos:', error);
        this.mostrarMensaje('Error al cargar períodos contables. Verifique la conexión con el servidor.', 'error');
        this.periodos = [];
      }
    });
  }

  /**
   * Carga las cuentas contables
   */
  cargarCuentas(): void {
    this.planCuentaService.getAll().subscribe({
      next: (cuentas) => {
        this.cuentas = cuentas || [];
      },
      error: (error) => {
        console.error('Error al cargar cuentas:', error);
        this.mostrarMensaje('Error al cargar plan de cuentas. Verifique la conexión con el servidor.', 'error');
        this.cuentas = [];
      }
    });
  }

  /**
   * Carga los centros de costo
   */
  cargarCentrosCosto(): void {
    this.centroCostoService.getAll().subscribe({
      next: (centros) => {
        // Filtrar por empresa 280
        this.centrosCosto = (centros || []).filter(c => c.empresa?.codigo === this.EMPRESA_CODIGO);
      },
      error: (error) => {
        console.error('Error al cargar centros de costo:', error);
        this.mostrarMensaje('Error al cargar centros de costo. Verifique la conexión con el servidor.', 'error');
        this.centrosCosto = [];
      }
    });
  }

  /**
   * Aplica los filtros a los datos
   */
  aplicarFiltros(): void {
    const filtros = this.filtroForm.value as FiltrosAsiento;

    if (this.todosFiltrosVacios(filtros)) {
      this.cargarDatos();
      return;
    }

    this.cargando = true;
    this.asientoService.selectByCriteria(filtros).subscribe({
      next: (asientos) => {
        // Filtrar por empresa 280 también en búsqueda
        this.dataSource.data = (asientos || []).filter(a => a.empresa?.codigo === this.EMPRESA_CODIGO);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al filtrar asientos:', error);
        this.mostrarMensaje('Error al filtrar los asientos', 'error');
        this.cargando = false;
      }
    });
  }

  /**
   * Verifica si todos los filtros están vacíos
   */
  todosFiltrosVacios(filtros: FiltrosAsiento): boolean {
    return !filtros.fechaDesde && !filtros.fechaHasta && !filtros.tipoAsiento &&
           filtros.estado === null && !filtros.numero && !filtros.periodo && !filtros.observaciones;
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
   * Mostrar formulario para nuevo asiento
   */
  nuevoAsiento(): void {
    this.editandoAsiento = false;
    this.asientoSeleccionado = null;
    this.asientoForm.reset({
      fechaAsiento: new Date()
    });

    // Limpiar detalles
    while (this.detalles.length) {
      this.detalles.removeAt(0);
    }

    // Agregar primera fila de detalle
    this.agregarDetalle();

    this.mostrarFormulario = true;
    this.tabIndex = 1;
    this.calcularTotales();
  }

  /**
   * Editar asiento existente
   */
  editarAsiento(asiento: Asiento): void {
    if (!this.asientoService.puedeEditar(asiento)) {
      this.mostrarMensaje('Solo se pueden editar asientos en estado incompleto', 'warning');
      return;
    }

    this.editandoAsiento = true;
    this.asientoSeleccionado = asiento;

    // Cargar datos del asiento
    this.asientoForm.patchValue({
      codigo: asiento.codigo,
      tipoAsiento: asiento.tipoAsiento,
      fechaAsiento: asiento.fechaAsiento,
      periodo: asiento.periodo,
      observaciones: asiento.observaciones
    });

    // Limpiar y cargar detalles
    while (this.detalles.length) {
      this.detalles.removeAt(0);
    }

    if (asiento.detalles) {
      asiento.detalles.forEach(detalle => {
        const detalleForm = this.crearDetalleForm();
        detalleForm.patchValue({
          codigo: detalle.codigo,
          planCuenta: detalle.planCuenta,
          descripcion: detalle.descripcion,
          valorDebe: detalle.valorDebe,
          valorHaber: detalle.valorHaber,
          centroCosto: detalle.centroCosto
        });
        this.detalles.push(detalleForm);
      });
    }

    this.mostrarFormulario = true;
    this.tabIndex = 1;
    this.actualizarDataSourceDetalles();
    this.calcularTotales();
  }

  /**
   * Agregar nueva fila de detalle
   */
  agregarDetalle(): void {
    const detalleForm = this.crearDetalleForm();
    this.detalles.push(detalleForm);
    this.actualizarDataSourceDetalles();

    // Configurar autocomplete para este índice
    const index = this.detalles.length - 1;
    this.configurarAutocompleteCuenta(index);
    this.configurarAutocompleteCentroCosto(index);
  }

  /**
   * Eliminar fila de detalle
   */
  eliminarDetalle(index: number): void {
    if (this.detalles.length > 1) {
      this.detalles.removeAt(index);
      this.actualizarDataSourceDetalles();
      this.calcularTotales();
    } else {
      this.mostrarMensaje('Debe mantener al menos una línea de detalle', 'warning');
    }
  }

  /**
   * Actualiza el data source de detalles
   */
  actualizarDataSourceDetalles(): void {
    this.dataSourceDetalles.data = this.detalles.controls.map((control, index) => ({
      ...control.value,
      index
    }));
  }

  /**
   * Calcula los totales debe y haber
   */
  calcularTotales(): void {
    this.totalDebe = this.detalles.controls.reduce((sum, control) =>
      sum + (control.get('valorDebe')?.value || 0), 0);

    this.totalHaber = this.detalles.controls.reduce((sum, control) =>
      sum + (control.get('valorHaber')?.value || 0), 0);

    this.diferencia = this.totalDebe - this.totalHaber;
  }

  /**
   * Configura autocomplete para cuenta
   */
  configurarAutocompleteCuenta(index: number): void {
    if (!this.cuentasFiltradas[index]) {
      this.cuentasFiltradas[index] = [...this.cuentas];
    }

    const control = this.detalles.at(index).get('planCuenta');
    if (control) {
      control.valueChanges.subscribe(value => {
        if (typeof value === 'string') {
          this.cuentasFiltradas[index] = this.cuentas.filter(cuenta =>
            cuenta.nombre.toLowerCase().includes(value.toLowerCase()) ||
            cuenta.cuentaContable.includes(value)
          );
        }
      });
    }
  }

  /**
   * Configura autocomplete para centro de costo
   */
  configurarAutocompleteCentroCosto(index: number): void {
    if (!this.centrosCostoFiltrados[index]) {
      this.centrosCostoFiltrados[index] = [...this.centrosCosto];
    }

    const control = this.detalles.at(index).get('centroCosto');
    if (control) {
      control.valueChanges.subscribe(value => {
        if (typeof value === 'string') {
          this.centrosCostoFiltrados[index] = this.centrosCosto.filter(centro =>
            centro.nombre.toLowerCase().includes(value.toLowerCase()) ||
            centro.numero.toString().includes(value)
          );
        }
      });
    }
  }

  /**
   * Formatear cuenta para mostrar
   */
  mostrarCuenta(cuenta: PlanCuenta): string {
    return cuenta ? `${cuenta.cuentaContable} - ${cuenta.nombre}` : '';
  }

  /**
   * Formatear centro de costo para mostrar
   */
  mostrarCentroCosto(centro: CentroCosto): string {
    return centro ? `${centro.numero} - ${centro.nombre}` : '';
  }

  /**
   * Guardar asiento
   */
  guardarAsiento(): void {
    if (this.asientoForm.invalid) {
      this.marcarCamposComoTocados();
      this.mostrarMensaje('Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    // Validar que haya al menos 2 detalles
    if (this.detalles.length < 2) {
      this.mostrarMensaje('Debe tener al menos 2 líneas de detalle', 'warning');
      return;
    }

    // Validar balance
    if (!this.asientoService.validarBalance(this.detalles.value)) {
      this.mostrarMensaje('El asiento debe estar balanceado (Debe = Haber)', 'error');
      return;
    }

    const formValue = this.asientoForm.value;
    const datosAsiento: CrearAsiento = {
      tipoAsiento: formValue.tipoAsiento,
      fechaAsiento: formValue.fechaAsiento,
      observaciones: formValue.observaciones,
      periodo: formValue.periodo,
      detalles: formValue.detalles.map((d: any) => ({
        planCuenta: d.planCuenta.codigo,
        descripcion: d.descripcion,
        valorDebe: d.valorDebe || 0,
        valorHaber: d.valorHaber || 0,
        centroCosto: d.centroCosto?.codigo
      }))
    };

    this.cargando = true;

    if (this.editandoAsiento) {
      // Actualizar asiento existente
      this.asientoService.actualizarAsiento(this.asientoSeleccionado!.codigo, datosAsiento).subscribe({
        next: (resultado) => {
          if (resultado) {
            this.mostrarMensaje('Asiento actualizado exitosamente', 'success');
            this.cancelarFormulario();
            this.cargarDatos();
          }
        },
        error: (error) => {
          console.error('Error al actualizar asiento:', error);
          this.mostrarMensaje(
            error?.error?.message || 'Error al actualizar el asiento. Verifique la conexión con el servidor.',
            'error'
          );
          this.cargando = false;
        }
      });
    } else {
      // Crear nuevo asiento
      this.asientoService.crearAsiento(datosAsiento).subscribe({
        next: (resultado) => {
          if (resultado) {
            this.mostrarMensaje('Asiento creado exitosamente', 'success');
            this.cancelarFormulario();
            this.cargarDatos();
          }
        },
        error: (error) => {
          console.error('Error al crear asiento:', error);
          this.mostrarMensaje(
            error?.error?.message || 'Error al crear el asiento. Verifique la conexión con el servidor.',
            'error'
          );
          this.cargando = false;
        }
      });
    }
  }

  /**
   * Anular asiento
   */
  anularAsiento(asiento: Asiento): void {
    if (!this.asientoService.puedeAnular(asiento)) {
      this.mostrarMensaje('No se puede anular este asiento', 'warning');
      return;
    }

    const observacion = prompt('Ingrese la razón de anulación:');
    if (!observacion) return;

    this.cargando = true;
    this.asientoService.anularAsiento(asiento.codigo, observacion).subscribe({
      next: (exito) => {
        if (exito) {
          this.mostrarMensaje('Asiento anulado exitosamente', 'success');
          this.cargarDatos();
        } else {
          this.mostrarMensaje('No se pudo anular el asiento', 'error');
          this.cargando = false;
        }
      },
      error: (error) => {
        console.error('Error al anular asiento:', error);
        this.mostrarMensaje('Error al anular el asiento', 'error');
        this.cargando = false;
      }
    });
  }

  /**
   * Reversar asiento
   */
  reversarAsiento(asiento: Asiento): void {
    if (!this.asientoService.puedeReversar(asiento)) {
      this.mostrarMensaje('No se puede reversar este asiento', 'warning');
      return;
    }

    const observacion = prompt('Ingrese la razón de reversa:');
    if (!observacion) return;

    this.cargando = true;
    this.asientoService.reversarAsiento(asiento.codigo, observacion).subscribe({
      next: (asientoReversa) => {
        if (asientoReversa) {
          this.mostrarMensaje('Asiento reversado exitosamente', 'success');
          this.cargarDatos();
        } else {
          this.mostrarMensaje('No se pudo reversar el asiento', 'error');
          this.cargando = false;
        }
      },
      error: (error) => {
        console.error('Error al reversar asiento:', error);
        this.mostrarMensaje('Error al reversar el asiento', 'error');
        this.cargando = false;
      }
    });
  }

  /**
   * Eliminar asiento
   */
  eliminarAsiento(asiento: Asiento): void {
    if (!this.asientoService.puedeEliminar(asiento)) {
      this.mostrarMensaje('Solo se pueden eliminar asientos incompletos', 'warning');
      return;
    }

    if (confirm(`¿Está seguro de eliminar el asiento ${asiento.numero}?`)) {
      this.cargando = true;
      this.asientoService.eliminarAsiento(asiento.codigo).subscribe({
        next: (exito) => {
          if (exito) {
            this.mostrarMensaje('Asiento eliminado exitosamente', 'success');
            this.cargarDatos();
          } else {
            this.mostrarMensaje('No se pudo eliminar el asiento', 'error');
            this.cargando = false;
          }
        },
        error: (error) => {
          console.error('Error al eliminar asiento:', error);
          this.mostrarMensaje('Error al eliminar el asiento', 'error');
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
    this.editandoAsiento = false;
    this.asientoSeleccionado = null;
    this.asientoForm.reset();
    this.cargando = false;
    this.tabIndex = 0;

    // Limpiar detalles
    while (this.detalles.length) {
      this.detalles.removeAt(0);
    }

    this.totalDebe = 0;
    this.totalHaber = 0;
    this.diferencia = 0;
  }

  /**
   * Marcar todos los campos como tocados
   */
  marcarCamposComoTocados(): void {
    this.asientoForm.markAllAsTouched();

    // Marcar también los detalles
    this.detalles.controls.forEach(control => {
      control.markAllAsTouched();
    });
  }

  /**
   * Calcular total debe de un asiento
   */
  calcularTotalDebe(asiento: Asiento): number {
    return asiento.detalles?.reduce((sum, d) => sum + d.valorDebe, 0) || 0;
  }

  /**
   * Calcular total haber de un asiento
   */
  calcularTotalHaber(asiento: Asiento): number {
    return asiento.detalles?.reduce((sum, d) => sum + d.valorHaber, 0) || 0;
  }

  /**
   * Obtiene el texto del estado
   */
  getEstadoTexto(estado: EstadoAsiento): string {
    return this.asientoService.getEstadoTexto(estado);
  }

  /**
   * Obtiene la clase CSS para el badge del estado
   */
  getEstadoBadgeClass(estado: EstadoAsiento): string {
    return this.asientoService.getEstadoBadgeClass(estado);
  }

  /**
   * Verifica si se puede editar un asiento
   */
  puedeEditar(asiento: Asiento): boolean {
    return this.asientoService.puedeEditar(asiento);
  }

  /**
   * Verifica si se puede anular un asiento
   */
  puedeAnular(asiento: Asiento): boolean {
    return this.asientoService.puedeAnular(asiento);
  }

  /**
   * Verifica si se puede reversar un asiento
   */
  puedeReversar(asiento: Asiento): boolean {
    return this.asientoService.puedeReversar(asiento);
  }

  /**
   * Verifica si se puede eliminar un asiento
   */
  puedeEliminar(asiento: Asiento): boolean {
    return this.asientoService.puedeEliminar(asiento);
  }

  /**
   * Verifica si el asiento está balanceado
   */
  estaBalanceado(): boolean {
    return Math.abs(this.diferencia) < 0.01;
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
   * Cuando cambia un valor en el detalle
   */
  onDetalleChange(index: number): void {
    this.actualizarDataSourceDetalles();
    this.calcularTotales();
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
   * Verifica si se viene desde una plantilla para pre-cargar datos
   */
  verificarPlantilla(): void {
    // Verificar query params
    this.route.queryParams.subscribe(params => {
      const plantillaCodigo = params['plantilla'];

      if (plantillaCodigo) {
        // Obtener datos de la plantilla desde localStorage
        const plantillaDataStr = localStorage.getItem('plantillaParaAsiento');

        if (plantillaDataStr) {
          try {
            const plantillaData = JSON.parse(plantillaDataStr);
            this.crearAsientoDesdeTemplate(plantillaData);

            // Limpiar datos después del uso
            localStorage.removeItem('plantillaParaAsiento');
          } catch (error) {
            console.error('Error al parsear datos de plantilla:', error);
            this.mostrarMensaje('Error al cargar datos de la plantilla', 'error');
          }
        }
      }
    });
  }

  /**
   * Crea un asiento basado en una plantilla
   */
  private crearAsientoDesdeTemplate(plantillaData: any): void {
    this.mostrarMensaje(`Creando asiento desde plantilla: ${plantillaData.plantillaNombre}`, 'success');

    // Cambiar a la pestaña de formulario
    this.tabIndex = 1;
    this.mostrarFormulario = true;
    this.editandoAsiento = false;
    this.asientoSeleccionado = null;

    // Pre-llenar el formulario con datos básicos
    this.asientoForm.patchValue({
      observaciones: `Asiento creado desde plantilla: ${plantillaData.plantillaNombre}`,
      fechaAsiento: new Date()
    });

    // Cargar detalles de la plantilla
    setTimeout(() => {
      this.cargarDetallesDesdeTemplate(plantillaData.detalles);
    }, 500);
  }

  /**
   * Carga los detalles de la plantilla al formulario
   */
  private cargarDetallesDesdeTemplate(detallesTemplate: any[]): void {
    const detallesArray = this.asientoForm.get('detalles') as FormArray;

    // Limpiar detalles existentes
    while (detallesArray.length !== 0) {
      detallesArray.removeAt(0);
    }

    // Añadir detalles de la plantilla utilizando la estructura del formulario
    detallesTemplate.forEach((detalle, index) => {
      const detalleForm = this.crearDetalleForm();
      detalleForm.patchValue({
        planCuenta: detalle.planCuenta,
        descripcion: detalle.descripcion || '',
        valorDebe: detalle.movimiento === 1 ? 0 : 0,
        valorHaber: detalle.movimiento === 2 ? 0 : 0,
        centroCosto: null
      });

      detallesArray.push(detalleForm);

      // Configurar autocompletes por línea
      this.configurarAutocompleteCuenta(index);
      this.configurarAutocompleteCentroCosto(index);
    });

    this.actualizarDataSourceDetalles();
    this.calcularTotales();

    this.mostrarMensaje(`Se cargaron ${detallesTemplate.length} detalles desde la plantilla. Complete los valores.`, 'success');
  }
}
