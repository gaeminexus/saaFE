import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { Asiento } from '../../model/asiento';
import { CentroCosto } from '../../model/centro-costo';
import { PlanCuenta } from '../../model/plan-cuenta';
import { TipoAsiento } from '../../model/tipo-asiento';
import { AsientoService } from '../../service/asiento.service';
import { CentroCostoService } from '../../service/centro-costo.service';
import { DetalleAsientoService } from '../../service/detalle-asiento.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { TipoAsientoService } from '../../service/tipo-asiento.service';
import { PlanCuentaSelectorDialogComponent } from '../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';

interface CuentaItem {
  cuenta: PlanCuenta | null;
  valor: number;
  tipo: 'DEBE' | 'HABER';
  centroCosto?: CentroCosto | null; // Centro de costo asociado
  id?: string; // Para trackear items únicos
}

@Component({
  selector: 'app-asientos-contables-dinamico',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
    MatDialogModule,
    DragDropModule,
  ],
  templateUrl: './asientos-contables-dinamico.html',
  styleUrl: './asientos-contables-dinamico.scss',
})
export class AsientosContablesDinamico implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  form!: FormGroup;

  // Estado
  loading = false;
  codigoAsientoActual: number | null = null; // Para trackear si estamos editando
  asientoActual: Asiento | null = null; // Para almacenar datos completos del asiento
  detallesOriginales: any[] = []; // Para trackear detalles cargados del backend

  // Arrays para el grid con drag-and-drop
  cuentasDebeGrid: CuentaItem[] = [];
  cuentasHaberGrid: CuentaItem[] = [];

  // Totales
  totalDebe = 0;
  totalHaber = 0;
  diferencia = 0;

  // Autocomplete para búsqueda de cuentas
  cuentasFiltradasDebe: Observable<PlanCuenta[]>[] = [];
  cuentasFiltradasHaber: Observable<PlanCuenta[]>[] = [];

  // Rubros para dropdowns
  tiposAsientos: any[] = [];
  cuentasPlan: PlanCuenta[] = [];
  centrosCosto: CentroCosto[] = [];

  // Constantes de rubros
  private readonly RUBRO_TIPO_ASIENTO = 15;

  // Columnas para mat-table
  displayedColumns: string[] = ['cuenta', 'valor', 'acciones'];

  // Grid de detalles del asiento
  detalleDataSource = new MatTableDataSource<any>([]);
  detalleColumns: string[] = ['cuenta', 'descripcion', 'centroCosto', 'debe', 'haber', 'tipo'];

  // Empresa del usuario logueado
  private get idSucursal(): number {
    return parseInt(localStorage.getItem('idSucursal') || '280', 10);
  }

  constructor(
    private fb: FormBuilder,
    private detalleRubroService: DetalleRubroService,
    private tipoAsientoService: TipoAsientoService,
    private asientoService: AsientoService,
    private detalleAsientoService: DetalleAsientoService,
    private planCuentaService: PlanCuentaService,
    private centroCostoService: CentroCostoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.cargarRubros();

    // Cargar datos paralelos
    Promise.all([this.cargarCuentasPlan(), this.cargarCentrosCosto()]).then(() => {
      this.verificarCargaAsiento();
    });
  }

  /**
   * Verifica si se debe cargar un asiento existente desde query params
   */
  private verificarCargaAsiento(): void {
    this.route.queryParams.subscribe((params) => {
      const asientoId = params['id'];
      const mode = params['mode'];

      if (asientoId) {
        console.log(`🔍 Cargando asiento ID: ${asientoId}, modo: ${mode || 'edit'}`);
        this.cargarAsientoPorId(parseInt(asientoId, 10), mode);
      }
    });
  }

  private cargarRubros(): void {
    // Cargar tipos de asientos desde el backend
    this.tipoAsientoService.getAll().subscribe({
      next: (data) => {
        if (data) {
          // Filtrar por: activos (estado = 1), no del sistema (sistema = 0 o null), y de la empresa del usuario
          this.tiposAsientos = data
            .filter(
              (tipo: TipoAsiento) =>
                tipo.estado === 1 &&
                (tipo.sistema === 0 || !tipo.sistema) &&
                tipo.empresa?.codigo === this.idSucursal
            )
            .map((tipo: TipoAsiento) => ({
              id: tipo.codigo,
              nombre: tipo.nombre,
              codigoAlterno: tipo.codigoAlterno,
            }));
          console.log(
            `📋 Tipos de Asientos cargados para empresa ${this.idSucursal}:`,
            this.tiposAsientos
          );
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar tipos de asientos:', err);
        this.tiposAsientos = [];
      },
    });
  }

  private cargarCuentasPlan(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cargar cuentas del plan desde el backend
      this.planCuentaService.getAll().subscribe({
        next: (data) => {
          if (data) {
            // Filtrar solo cuentas activas (estado = 1) y de movimiento (tipo = 2)
            this.cuentasPlan = data
              .filter((cuenta: PlanCuenta) => cuenta.estado === 1 && cuenta.tipo === 2)
              .sort((a, b) => {
                // Ordenar por cuentaContable
                const cuentaA = a.cuentaContable || '';
                const cuentaB = b.cuentaContable || '';
                return cuentaA.localeCompare(cuentaB);
              });
            console.log(
              `📊 Cuentas de Movimiento cargadas para empresa ${this.idSucursal}:`,
              this.cuentasPlan.length
            );
            resolve();
          } else {
            console.warn('⚠️ No se recibieron datos de cuentas del plan');
            this.cuentasPlan = [];
            resolve();
          }
        },
        error: (err) => {
          console.error('❌ Error al cargar cuentas del plan:', err);
          this.cuentasPlan = [];
          reject(err);
        },
      });
    });
  }

  /**
   * Carga centros de costo desde el backend
   */
  private cargarCentrosCosto(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Crear criterios de filtrado usando selectByCriteria - combinar empresa y estado en un solo objeto
      const criterios = new DatosBusqueda();

      // Filtrar por empresa (usando idSucursal como empresa)
      criterios.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.LONG,
        'empresa.codigo',
        this.idSucursal.toString(),
        TipoComandosBusqueda.IGUAL
      );

      this.centroCostoService.selectByCriteria([criterios]).subscribe({
        next: (data: CentroCosto[] | null) => {
          if (data && data.length > 0) {
            // Filtrar localmente por estado activo (mostrar todos para contexto jerárquico)
            this.centrosCosto = data
              .filter((centro: CentroCosto) => centro.estado === 1)
              .sort((a: CentroCosto, b: CentroCosto) => {
                const nombreA = a.nombre || '';
                const nombreB = b.nombre || '';
                return nombreA.localeCompare(nombreB);
              });
          } else {
            console.warn(
              `⚠️ No se encontraron centros de costo activos para empresa ${this.idSucursal}`
            );
            this.centrosCosto = [];
          }
          resolve();
        },
        error: (err: any) => {
          console.error('❌ Error cargando centros de costo con criterios:', err);
          // Fallback: cargar todos y filtrar localmente
          this.centroCostoService.getAll().subscribe({
            next: (dataFallback: CentroCosto[] | null) => {
              if (dataFallback) {
                // Filtrar localmente por empresa y estado activo (mostrar todos para contexto jerárquico)
                this.centrosCosto = dataFallback
                  .filter(
                    (centro: CentroCosto) =>
                      centro.estado === 1 && centro.empresa?.codigo === this.idSucursal
                  )
                  .sort((a: CentroCosto, b: CentroCosto) => {
                    const nombreA = a.nombre || '';
                    const nombreB = b.nombre || '';
                    return nombreA.localeCompare(nombreB);
                  });
              } else {
                this.centrosCosto = [];
              }
              resolve();
            },
            error: (errFallback: any) => {
              console.error('❌ Error en fallback de centros de costo:', errFallback);
              this.centrosCosto = [];
              resolve(); // No rechazar, permitir que continúe la aplicación
            },
          });
        },
      });
    });
  }

  /**
   * Carga un asiento existente por ID con sus detalles
   */
  private cargarAsientoPorId(id: number, mode?: string): void {
    this.loading = true;

    // Crear criterios usando selectByCriteria (POST) ya que getById (GET) retorna 405
    const criterios = new DatosBusqueda();
    criterios.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'codigo',
      id.toString(),
      TipoComandosBusqueda.IGUAL
    );

    // Cargar asiento principal usando selectByCriteria
    this.asientoService.selectByCriteria([criterios]).subscribe({
      next: (asientos: Asiento[] | null) => {
        if (asientos && asientos.length > 0) {
          const asiento = asientos[0]; // Tomar el primer resultado

          this.codigoAsientoActual = asiento.codigo;
          this.asientoActual = asiento; // Almacenar datos completos

          // Procesar fechas con manejo de diferentes formatos
          const fechaAsiento = this.parseFechaFromBackend(asiento.fechaAsiento);
          const fechaIngreso = this.parseFechaFromBackend(asiento.fechaIngreso);

          // Llenar el formulario con los datos del asiento
          this.form.patchValue({
            numero: asiento.numero,
            fechaAsiento: fechaAsiento,
            fechaIngreso: fechaIngreso,
            observaciones: asiento.observaciones || '',
            tipo: asiento.tipoAsiento?.codigo || null,
            estado: asiento.estado || 1,
          });

          // Forzar actualización de controles específicos y validez
          const fechaAsientoControl = this.form.get('fechaAsiento');
          const fechaIngresoControl = this.form.get('fechaIngreso');

          fechaAsientoControl?.setValue(fechaAsiento);
          fechaAsientoControl?.updateValueAndValidity();

          fechaIngresoControl?.setValue(fechaIngreso);
          fechaIngresoControl?.updateValueAndValidity();

          // Cargar detalles del asiento
          this.cargarDetallesAsiento(id);

          if (mode === 'view') {
            // Deshabilitar formulario para solo lectura
            this.form.disable();
            this.showMessage('Asiento cargado en modo solo lectura', 'info');
          } else {
            this.showMessage(`Asiento ${asiento.numero} cargado para edición`, 'success');
          }
        } else {
          console.warn('⚠️ No se encontró asiento con ID:', id);
          this.loading = false;
          this.showMessage(`No se encontró el asiento con ID ${id}`, 'error');
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar asiento:', err);
        this.loading = false;
        this.showMessage('Error al cargar el asiento', 'error');
      },
    });
  }

  /**
   * Carga los detalles de un asiento y los coloca en el grid dinámico
   */
  private cargarDetallesAsiento(asientoId: number): void {
    // Crear criterios usando el patrón DatosBusqueda como en listado-asientos
    const criterioConsultaArray: Array<DatosBusqueda> = [];

    // Filtro por asiento ID
    const criterioAsiento = new DatosBusqueda();
    criterioAsiento.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'asiento',
      'codigo',
      asientoId.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterioAsiento);

    // Ordenar por código del detalle
    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('codigo');
    criterioConsultaArray.push(criterioOrden);

    this.detalleAsientoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (detalles: any) => {
        // Limpiar grids actuales siempre
        this.cuentasDebeGrid = [];
        this.cuentasHaberGrid = [];

        if (detalles && (Array.isArray(detalles) ? detalles.length > 0 : true)) {
          // Procesar cada detalle
          const detallesArray = Array.isArray(detalles) ? detalles : [detalles];

          // Guardar detalles originales para comparar en update
          this.detallesOriginales = [...detallesArray];

          let detallesProcesados = 0;
          detallesArray.forEach((detalle: any) => {
            const cuenta = this.cuentasPlan.find((c) => c.codigo === detalle.planCuenta?.codigo);

            if (cuenta) {
              // Buscar centro de costo si existe en el detalle
              let centroCosto = null;
              if (detalle.centroCosto?.codigo) {
                centroCosto = this.centrosCosto.find(
                  (c) => c.codigo === detalle.centroCosto.codigo
                );
              }

              const item: CuentaItem = {
                cuenta: cuenta,
                valor: 0,
                tipo: 'DEBE',
                centroCosto: centroCosto || null,
                id: `item_${Date.now()}_${Math.random()}`,
              };

              if (detalle.valorDebe > 0) {
                item.valor = detalle.valorDebe;
                item.tipo = 'DEBE';
                this.cuentasDebeGrid.push(item);
                detallesProcesados++;
              } else if (detalle.valorHaber > 0) {
                item.valor = detalle.valorHaber;
                item.tipo = 'HABER';
                this.cuentasHaberGrid.push(item);
                detallesProcesados++;
              }
            } else {
              console.warn('⚠️ Cuenta no encontrada para detalle:', detalle);
              console.warn(
                '🔍 Buscando código:',
                detalle.planCuenta?.codigo,
                'en',
                this.cuentasPlan.length,
                'cuentas disponibles'
              );
              console.warn(
                '🔍 Códigos disponibles:',
                this.cuentasPlan.map((c) => c.codigo).slice(0, 10),
                '...'
              );
            }
          });

          if (detallesProcesados === 0) {
            this.showMessage('El asiento no tiene detalles válidos', 'info');
          }
        } else {
          this.showMessage('Este asiento no tiene detalles asociados', 'info');
        }

        // Recalcular totales y actualizar grid de detalles siempre
        this.calcularTotalesGrid();
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar detalles del asiento:', err);
        this.loading = false;
        this.showMessage('Error al cargar los detalles del asiento', 'error');
      },
    });
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      tipo: ['', [Validators.required]],
      numero: ['', [Validators.required]],
      fechaAsiento: [new Date(), [Validators.required]],
      fechaIngreso: [{ value: new Date(), disabled: true }],
      estado: [4], // Campo habilitado y con valor numérico por defecto (4 = INCOMPLETO)
      observaciones: ['', [Validators.maxLength(500)]],
      cuentasDebe: this.fb.array([this.createCuentaGroup()]),
      cuentasHaber: this.fb.array([this.createCuentaGroup()]),
    });

    // Configurar autocomplete para las filas iniciales
    setTimeout(() => {
      this.configurarAutocompleteDebe(0);
      this.configurarAutocompleteHaber(0);
    }, 0);
  }

  private createCuentaGroup(): FormGroup {
    return this.fb.group({
      cuenta: [null], // No requerido - permite asientos incompletos
      cuentaBusqueda: [''], // Campo para autocomplete
      valor: [0], // No requerido - permite asientos incompletos
      centroCosto: [null], // Centro de costo opcional
    });
  }

  get cuentasDebe(): FormArray {
    return this.form.get('cuentasDebe') as FormArray;
  }

  get cuentasHaber(): FormArray {
    return this.form.get('cuentasHaber') as FormArray;
  }

  agregarCuentaDebe(): void {
    const index = this.cuentasDebe.length;
    this.cuentasDebe.push(this.createCuentaGroup());

    // Configurar autocomplete para la nueva fila
    setTimeout(() => this.configurarAutocompleteDebe(index), 0);
  }

  agregarCuentaHaber(): void {
    const index = this.cuentasHaber.length;
    this.cuentasHaber.push(this.createCuentaGroup());

    // Configurar autocomplete para la nueva fila
    setTimeout(() => this.configurarAutocompleteHaber(index), 0);
  }

  eliminarCuentaDebe(index: number): void {
    if (this.cuentasDebe.length > 1) {
      this.cuentasDebe.removeAt(index);
      this.calcularTotales();
    }
  }

  eliminarCuentaHaber(index: number): void {
    if (this.cuentasHaber.length > 1) {
      this.cuentasHaber.removeAt(index);
      this.calcularTotales();
    }
  }

  calcularTotales(): void {
    this.totalDebe = this.cuentasDebe.controls.reduce((sum, control) => {
      return sum + (Number(control.get('valor')?.value) || 0);
    }, 0);

    this.totalHaber = this.cuentasHaber.controls.reduce((sum, control) => {
      return sum + (Number(control.get('valor')?.value) || 0);
    }, 0);

    this.diferencia = Math.abs(this.totalDebe - this.totalHaber);
  }

  onValorChange(): void {
    this.calcularTotales();
  }

  /**
   * Agregar cuenta al grid desde los formularios
   */
  agregarCuentaAlGrid(tipo: 'DEBE' | 'HABER'): void {
    const formArray = tipo === 'DEBE' ? this.cuentasDebe : this.cuentasHaber;
    const ultimoIndex = formArray.length - 1;
    const ultimoControl = formArray.at(ultimoIndex);

    const cuenta = ultimoControl.get('cuenta')?.value;
    const valor = ultimoControl.get('valor')?.value;
    const centroCosto = ultimoControl.get('centroCosto')?.value;

    if (!cuenta || !valor || valor <= 0) {
      this.snackBar.open('Por favor complete la cuenta y el valor', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      });
      return;
    }

    const nuevaCuenta: CuentaItem = {
      cuenta,
      valor: Number(valor),
      tipo,
      centroCosto: centroCosto || null,
      id: `${tipo}-${Date.now()}-${Math.random()}`,
    };

    if (tipo === 'DEBE') {
      this.cuentasDebeGrid.push(nuevaCuenta);
    } else {
      this.cuentasHaberGrid.push(nuevaCuenta);
    }

    // Limpiar el formulario
    ultimoControl.patchValue({ cuenta: null, valor: 0, centroCosto: null });

    this.calcularTotalesGrid();
  }

  /**
   * Calcular totales desde los grids
   */
  calcularTotalesGrid(): void {
    this.totalDebe = this.cuentasDebeGrid.reduce((sum, item) => sum + item.valor, 0);
    this.totalHaber = this.cuentasHaberGrid.reduce((sum, item) => sum + item.valor, 0);
    this.diferencia = Math.abs(this.totalDebe - this.totalHaber);

    // Actualizar el grid de detalles
    this.actualizarGridDetalles();
  }

  /**
   * Manejar drag-and-drop entre listas
   */
  drop(event: CdkDragDrop<CuentaItem[]>, tipoDestino: 'DEBE' | 'HABER'): void {
    if (event.previousContainer === event.container) {
      // Reordenar dentro de la misma lista
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Transferir entre listas
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Actualizar el tipo de la cuenta movida
      const cuentaMovida = event.container.data[event.currentIndex];
      cuentaMovida.tipo = tipoDestino;
    }

    this.calcularTotalesGrid();
  }

  /**
   * Eliminar cuenta del grid
   */
  eliminarCuentaGrid(item: CuentaItem, tipo: 'DEBE' | 'HABER'): void {
    const array = tipo === 'DEBE' ? this.cuentasDebeGrid : this.cuentasHaberGrid;
    const index = array.findIndex((c) => c.id === item.id);

    if (index > -1) {
      array.splice(index, 1);
      this.calcularTotalesGrid();
    }
  }

  /**
   * Editar valor de cuenta en el grid
   */
  editarValorGrid(item: CuentaItem, nuevoValor: number): void {
    if (nuevoValor > 0) {
      item.valor = nuevoValor;
      this.calcularTotalesGrid();
    }
  }

  /**
   * Track by para optimizar renderizado
   */
  trackByCuentaId(index: number, item: CuentaItem): string {
    return item.id || `${index}`;
  }

  /**
   * Grabar solo la cabecera del asiento sin validar detalles
   */
  grabarCabecera(): void {
    // Validar solo campos de cabecera
    const tipo = this.form.get('tipo');
    const numero = this.form.get('numero');

    if (!tipo?.valid || !numero?.valid) {
      tipo?.markAsTouched();
      numero?.markAsTouched();

      this.snackBar.open(
        'Por favor completa los campos requeridos: Tipo de Asiento y Número',
        'Cerrar',
        {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        }
      );
      return;
    }

    this.loading = true;

    // Construir objeto para enviar al backend
    const tipoAsientoSeleccionado = this.tiposAsientos.find((t) => t.id === tipo?.value);

    // Obtener fechas del formulario
    const fechaAsiento = this.form.get('fechaAsiento')?.value;
    const fechaAsientoFormatted =
      fechaAsiento instanceof Date ? this.formatDateToLocalDate(fechaAsiento) : fechaAsiento;

    const asientoBackend: any = {
      empresa: {
        codigo: this.idSucursal,
      },
      tipoAsiento: {
        codigo: tipo?.value,
        nombre: tipoAsientoSeleccionado?.nombre || '',
      },
      numero: parseInt(numero?.value, 10),
      fechaAsiento: fechaAsientoFormatted,
      observaciones: this.form.get('observaciones')?.value?.trim() || '',
      estado: this.form.get('estado')?.value || this.asientoActual?.estado || 4, // Usar estado del formulario o del asiento existente
      nombreUsuario: localStorage.getItem('username') || 'sistema',
      fechaIngreso: this.formatDateToLocalDate(new Date()),
      numeroMes: new Date().getMonth() + 1,
      numeroAnio: new Date().getFullYear(),
      moneda: 1,
      rubroModuloClienteP: 0,
      rubroModuloClienteH: 0,
      rubroModuloSistemaP: 0,
      rubroModuloSistemaH: 0,
    };

    // Si estamos actualizando, incluir el código del asiento y período del asiento existente
    if (this.codigoAsientoActual) {
      asientoBackend.codigo = this.codigoAsientoActual;

      // Usar el período del asiento existente si está disponible
      if (this.asientoActual?.periodo) {
        asientoBackend.periodo = {
          codigo: this.asientoActual.periodo.codigo,
        };
      }
    }

    // Decidir si crear o actualizar
    const operacion = this.codigoAsientoActual
      ? this.asientoService.actualizarAsiento(this.codigoAsientoActual, asientoBackend)
      : this.asientoService.crearAsiento(asientoBackend);

    operacion.subscribe({
      next: (response) => {
        this.loading = false;

        // Guardar el código si es creación nueva
        if (!this.codigoAsientoActual && response.codigo) {
          this.codigoAsientoActual = response.codigo;
        }

        const mensaje = this.codigoAsientoActual
          ? `✅ Cabecera del Asiento #${response.numero} actualizada exitosamente`
          : `✅ Cabecera del Asiento #${response.numero} guardada exitosamente`;

        this.snackBar.open(mensaje, 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar'],
        });
      },
      error: (error) => {
        this.loading = false;
        const errorMsg = error?.error?.message || error?.message || 'Error desconocido';
        this.snackBar.open(`❌ Error al guardar cabecera: ${errorMsg}`, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Grabar los detalles del asiento (debe/haber) junto con la cabecera si es necesario
   */
  grabarDetalle(): void {
    // Validar solo campos básicos (tipo, número, fecha) - permitir asientos incompletos
    const tipoValido = this.form.get('tipo')?.valid;
    const numeroValido = this.form.get('numero')?.valid;
    const fechaValida = this.form.get('fechaAsiento')?.valid;

    if (!tipoValido || !numeroValido || !fechaValida) {
      this.form.markAllAsTouched();

      this.snackBar.open(
        'Por favor completa todos los campos requeridos: Tipo de Asiento y Número',
        'Cerrar',
        {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        }
      );
      return;
    }

    // Validar cuentas que tienen datos (validación condicional)
    const validacionCuentas = this.validarCuentasConDatos();
    if (validacionCuentas.errors.length > 0) {
      console.error('❌ Errores en cuentas con datos:', validacionCuentas.errors);
      this.snackBar.open(
        `Errores en las cuentas: ${validacionCuentas.errors.join(', ')}`,
        'Cerrar',
        {
          duration: 6000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        }
      );
      return;
    }

    // Advertir si el asiento no está balanceado, pero permitir guardarlo como INCOMPLETO
    if (this.diferencia !== 0) {
      console.warn(
        `⚠️ Asiento no balanceado. Debe: $${this.totalDebe.toFixed(
          2
        )} - Haber: $${this.totalHaber.toFixed(2)}`
      );
      this.snackBar.open(
        `📝 Guardando asiento INCOMPLETO. Debe: $${this.totalDebe.toFixed(
          2
        )} - Haber: $${this.totalHaber.toFixed(2)}`,
        'Cerrar',
        {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['warning-snackbar'],
        }
      );
    }

    this.loading = true;

    // Verificar si ya existe la cabecera del asiento (codigoAsientoActual no null)
    if (this.codigoAsientoActual) {
      // Si hay detalles originales cargados, hacer actualización inteligente
      if (this.detallesOriginales && this.detallesOriginales.length > 0) {
        this.actualizarDetallesDelAsiento(this.codigoAsientoActual);
      } else {
        this.grabarSoloDetalles();
      }
    } else {
      this.grabarCabeceraYDetalles();
    }
  }

  /**
   * Graba cabecera y detalles para un asiento nuevo
   */
  private grabarCabeceraYDetalles(): void {
    // Construir objeto para enviar al backend
    const tipoAsientoSeleccionado = this.tiposAsientos.find(
      (t) => t.id === this.form.get('tipo')?.value
    );

    const asientoBackend: any = {
      empresa: {
        codigo: this.idSucursal,
      },
      tipoAsiento: {
        codigo: this.form.get('tipo')?.value,
        nombre: tipoAsientoSeleccionado?.nombre || '',
      },
      numero: parseInt(this.form.get('numero')?.value, 10),
      fechaAsiento: this.form.get('fechaAsiento')?.value,
      observaciones: this.form.get('observaciones')?.value || '',
      estado: 4, // INCOMPLETO
      nombreUsuario: localStorage.getItem('username') || 'sistema',
      fechaIngreso: new Date(),
      // Campos requeridos por el backend
      numeroMes: new Date().getMonth() + 1,
      numeroAnio: new Date().getFullYear(),
      moneda: 1, // Default
      rubroModuloClienteP: 0,
      rubroModuloClienteH: 0,
      rubroModuloSistemaP: 0,
      rubroModuloSistemaH: 0,
      // Omitir período para asientos nuevos - el backend manejará el valor por defecto
    };

    this.asientoService.crearAsiento(asientoBackend).subscribe({
      next: (response) => {
        this.codigoAsientoActual = response.codigo; // Guardar código para futuros updates
        this.asientoActual = response; // Guardar datos completos

        // Ahora grabar los detalles
        this.grabarDetallesDelAsiento(response.codigo);
      },
      error: (error) => {
        console.error('❌ Error al crear cabecera del asiento:', error);
        this.loading = false;
        const errorMsg = error?.error?.message || error?.message || 'Error desconocido al guardar';
        this.snackBar.open(`❌ Error al crear asiento: ${errorMsg}`, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Graba solo los detalles para un asiento existente
   */
  private grabarSoloDetalles(): void {
    if (!this.codigoAsientoActual) {
      console.error('❌ No hay código de asiento para grabar detalles');
      this.loading = false;
      return;
    }

    console.log('📝 Grabando solo detalles del asiento ID:', this.codigoAsientoActual);
    this.grabarDetallesDelAsiento(this.codigoAsientoActual);
  }

  /**
   * Graba los detalles (cuentas debe/haber) de un asiento
   */
  private grabarDetallesDelAsiento(asientoId: number): void {
    // Recopilar detalles de debe y haber que tienen datos
    const detallesParaGrabar: any[] = [];

    // Procesar cuentas DEBE desde el GRID dinámico
    this.cuentasDebeGrid.forEach((item, index) => {
      if (item && item.cuenta && item.valor > 0) {
        const detalle: any = {
          asiento: {
            codigo: asientoId,
          },
          planCuenta: {
            codigo: item.cuenta.codigo,
          },
          valorDebe: item.valor,
          valorHaber: 0,
        };

        // Agregar centro de costo si está presente
        if (item.centroCosto) {
          detalle.centroCosto = {
            codigo: item.centroCosto.codigo,
          };
        }

        detallesParaGrabar.push(detalle);
      }
    });

    // Procesar cuentas HABER desde el GRID dinámico
    this.cuentasHaberGrid.forEach((item, index) => {
      if (item && item.cuenta && item.valor > 0) {
        const detalle: any = {
          asiento: {
            codigo: asientoId,
          },
          planCuenta: {
            codigo: item.cuenta.codigo,
          },
          valorDebe: 0,
          valorHaber: item.valor,
        };

        // Agregar centro de costo si está presente
        if (item.centroCosto) {
          detalle.centroCosto = {
            codigo: item.centroCosto.codigo,
          };
        }

        detallesParaGrabar.push(detalle);
      }
    });

    // FALLBACK: Si los grids están vacíos, intentar con FormArrays
    if (detallesParaGrabar.length === 0) {
      // Procesar cuentas DEBE desde FormArrays
      this.cuentasDebe.controls.forEach((control, index) => {
        const cuenta = control.get('cuenta')?.value;
        const valor = control.get('valor')?.value;
        const centroCosto = control.get('centroCosto')?.value;

        if (cuenta && valor > 0) {
          const detalle: any = {
            asiento: {
              codigo: asientoId,
            },
            planCuenta: {
              codigo: cuenta.codigo,
            },
            valorDebe: valor,
            valorHaber: 0,
          };

          // Agregar centro de costo si está presente
          if (centroCosto) {
            detalle.centroCosto = {
              codigo: centroCosto.codigo,
            };
          }

          detallesParaGrabar.push(detalle);
        }
      });

      // Procesar cuentas HABER
      this.cuentasHaber.controls.forEach((control, index) => {
        const cuenta = control.get('cuenta')?.value;
        const valor = control.get('valor')?.value;
        const centroCosto = control.get('centroCosto')?.value;

        if (cuenta && valor > 0) {
          const detalle: any = {
            asiento: {
              codigo: asientoId,
            },
            planCuenta: {
              codigo: cuenta.codigo,
            },
            valorDebe: 0,
            valorHaber: valor,
          };

          // Agregar centro de costo si está presente
          if (centroCosto) {
            detalle.centroCosto = {
              codigo: centroCosto.codigo,
            };
          }

          detallesParaGrabar.push(detalle);
        }
      });
    } // Fin del fallback

    if (detallesParaGrabar.length === 0) {
      this.loading = false;
      this.snackBar.open('No hay cuentas para grabar', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar'],
      });
      return;
    }

    console.log('📤 Enviando detalles al backend:', detallesParaGrabar);

    // Grabar cada detalle usando el servicio correspondiente
    let detallesGrabados = 0;
    let erroresDetalle: string[] = [];

    detallesParaGrabar.forEach((detalle) => {
      this.detalleAsientoService.add(detalle).subscribe({
        next: (response: any) => {
          detallesGrabados++;
          console.log(`✅ Detalle ${detallesGrabados} grabado:`, response);

          // Si todos los detalles se grabaron exitosamente
          if (detallesGrabados === detallesParaGrabar.length) {
            this.loading = false;
            this.snackBar.open(
              `✅ ${detallesGrabados} detalles del asiento grabados exitosamente`,
              'Cerrar',
              {
                duration: 4000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['success-snackbar'],
              }
            );
            // Recargar detalles para mostrar los cambios
            this.cargarDetallesAsiento(asientoId);
          }
        },
        error: (error: any) => {
          erroresDetalle.push(`Error en detalle: ${error?.message || 'Desconocido'}`);
          console.error('❌ Error al grabar detalle:', error);

          // Si ya procesamos todos los detalles (exitosos + errores)
          if (detallesGrabados + erroresDetalle.length === detallesParaGrabar.length) {
            this.loading = false;
            if (erroresDetalle.length > 0) {
              this.snackBar.open(
                `❌ Errores al grabar detalles: ${erroresDetalle.join(', ')}`,
                'Cerrar',
                {
                  duration: 6000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                  panelClass: ['error-snackbar'],
                }
              );
            }
          }
        },
      });
    });
  }

  /**
   * Actualiza los detalles existentes de un asiento
   */
  private actualizarDetallesDelAsiento(asientoId: number): void {
    console.log('🔄 Actualizando detalles del asiento ID:', asientoId);

    // Recopilar detalles actuales del grid
    const detallesActuales = this.recopilarDetallesDelGrid(asientoId);

    if (detallesActuales.length === 0) {
      console.log('ℹ️ No hay detalles para actualizar');
      this.loading = false;
      this.snackBar.open('No hay cuentas para actualizar', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar'],
      });
      return;
    }

    // Lógica de actualización: comparar con detalles originales
    const operaciones = this.determinarOperacionesDeActualizacion(detallesActuales);

    console.log('📋 Operaciones a realizar:', operaciones);

    this.ejecutarOperacionesDeActualizacion(operaciones, asientoId);
  }

  /**
   * Recopila detalles del grid dinámico
   */
  private recopilarDetallesDelGrid(asientoId: number): any[] {
    const detalles: any[] = [];

    // Procesar cuentas DEBE
    this.cuentasDebeGrid.forEach((item) => {
      if (item && item.cuenta && item.valor > 0) {
        detalles.push({
          asiento: { codigo: asientoId },
          planCuenta: { codigo: item.cuenta.codigo },
          valorDebe: item.valor,
          valorHaber: 0,
          tipo: 'DEBE',
        });
      }
    });

    // Procesar cuentas HABER
    this.cuentasHaberGrid.forEach((item) => {
      if (item && item.cuenta && item.valor > 0) {
        detalles.push({
          asiento: { codigo: asientoId },
          planCuenta: { codigo: item.cuenta.codigo },
          valorDebe: 0,
          valorHaber: item.valor,
          tipo: 'HABER',
        });
      }
    });

    return detalles;
  }

  /**
   * Determina qué operaciones hacer: crear, actualizar o eliminar detalles
   */
  private determinarOperacionesDeActualizacion(detallesActuales: any[]): any {
    const operaciones = {
      crear: [] as any[],
      actualizar: [] as any[],
      eliminar: [] as any[],
    };

    // Comparar detalles actuales con originales
    detallesActuales.forEach((detalleActual) => {
      const detalleOriginal = this.detallesOriginales.find(
        (orig) => orig.planCuenta?.codigo === detalleActual.planCuenta.codigo
      );

      if (detalleOriginal) {
        // Verificar si cambió el valor
        const valorOriginalDebe = detalleOriginal.valorDebe || 0;
        const valorOriginalHaber = detalleOriginal.valorHaber || 0;
        const valorActualDebe = detalleActual.valorDebe || 0;
        const valorActualHaber = detalleActual.valorHaber || 0;

        if (valorOriginalDebe !== valorActualDebe || valorOriginalHaber !== valorActualHaber) {
          operaciones.actualizar.push({
            ...detalleActual,
            codigo: detalleOriginal.codigo, // Necesario para update
          });
        }
      } else {
        // Es un nuevo detalle
        operaciones.crear.push(detalleActual);
      }
    });

    // Buscar detalles eliminados (estaban en originales pero no en actuales)
    this.detallesOriginales.forEach((detalleOriginal) => {
      const existe = detallesActuales.find(
        (actual) => actual.planCuenta.codigo === detalleOriginal.planCuenta?.codigo
      );

      if (!existe) {
        operaciones.eliminar.push(detalleOriginal);
      }
    });

    return operaciones;
  }

  /**
   * Ejecuta las operaciones de actualización determinadas
   */
  private ejecutarOperacionesDeActualizacion(operaciones: any, asientoId: number): void {
    let operacionesCompletadas = 0;
    const totalOperaciones =
      operaciones.crear.length + operaciones.actualizar.length + operaciones.eliminar.length;
    let errores: string[] = [];

    console.log(`🚀 Ejecutando ${totalOperaciones} operaciones de actualización`);

    if (totalOperaciones === 0) {
      console.log('ℹ️ No hay cambios para procesar');
      this.loading = false;
      this.snackBar.open('No hay cambios para actualizar', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['info-snackbar'],
      });
      return;
    }

    const verificarComplecion = () => {
      operacionesCompletadas++;
      if (operacionesCompletadas === totalOperaciones) {
        this.loading = false;
        if (errores.length === 0) {
          this.snackBar.open(
            `✅ Detalles actualizados: ${operaciones.crear.length} creados, ${operaciones.actualizar.length} modificados, ${operaciones.eliminar.length} eliminados`,
            'Cerrar',
            {
              duration: 4000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['success-snackbar'],
            }
          );
          // Recargar detalles para mostrar los cambios
          this.cargarDetallesAsiento(asientoId);
        } else {
          this.snackBar.open(`❌ Errores en actualización: ${errores.join(', ')}`, 'Cerrar', {
            duration: 6000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar'],
          });
        }
      }
    };

    // Ejecutar creaciones
    operaciones.crear.forEach((detalle: any) => {
      this.detalleAsientoService.add(detalle).subscribe({
        next: (response) => {
          console.log('✅ Detalle creado:', response);
          verificarComplecion();
        },
        error: (error) => {
          errores.push(`Error creando: ${error?.message || 'Desconocido'}`);
          console.error('❌ Error creando detalle:', error);
          verificarComplecion();
        },
      });
    });

    // Ejecutar actualizaciones
    operaciones.actualizar.forEach((detalle: any) => {
      this.detalleAsientoService.update(detalle).subscribe({
        next: (response) => {
          console.log('✅ Detalle actualizado:', response);
          verificarComplecion();
        },
        error: (error) => {
          errores.push(`Error actualizando: ${error?.message || 'Desconocido'}`);
          console.error('❌ Error actualizando detalle:', error);
          verificarComplecion();
        },
      });
    });

    // Ejecutar eliminaciones
    operaciones.eliminar.forEach((detalle: any) => {
      this.detalleAsientoService.delete(detalle.codigo).subscribe({
        next: (response) => {
          console.log('✅ Detalle eliminado:', response);
          verificarComplecion();
        },
        error: (error) => {
          errores.push(`Error eliminando: ${error?.message || 'Desconocido'}`);
          console.error('❌ Error eliminando detalle:', error);
          verificarComplecion();
        },
      });
    });
  }

  /**
   * Configurar paginador y ordenamiento después de la vista inicializada
   */
  ngAfterViewInit(): void {
    this.detalleDataSource.paginator = this.paginator;
    this.detalleDataSource.sort = this.sort;
  }

  /**
   * Actualiza el grid de detalles combinando cuentas debe y haber
   */
  private actualizarGridDetalles(): void {
    const detalles: any[] = [];

    // Agregar cuentas debe
    this.cuentasDebeGrid.forEach((cuenta) => {
      detalles.push({
        cuenta: cuenta.cuenta?.cuentaContable || '',
        descripcion: cuenta.cuenta?.nombre || '',
        centroCosto: cuenta.centroCosto
          ? `${cuenta.centroCosto.numero} - ${cuenta.centroCosto.nombre}`
          : '',
        debe: cuenta.valor,
        haber: 0,
        tipo: 'DEBE',
      });
    });

    // Agregar cuentas haber
    this.cuentasHaberGrid.forEach((cuenta) => {
      detalles.push({
        cuenta: cuenta.cuenta?.cuentaContable || '',
        descripcion: cuenta.cuenta?.nombre || '',
        centroCosto: cuenta.centroCosto
          ? `${cuenta.centroCosto.numero} - ${cuenta.centroCosto.nombre}`
          : '',
        debe: 0,
        haber: cuenta.valor,
        tipo: 'HABER',
      });
    });

    this.detalleDataSource.data = detalles;
  }

  /**
   * Formatea una fecha a formato LocalDate (YYYY-MM-DD) para el backend
   */
  private formatDateToLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Formato ISO completo para java.util.Date: YYYY-MM-DDTHH:mm:ss
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Muestra un mensaje usando MatSnackBar
   */
  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const panelClass =
      type === 'success'
        ? 'success-snackbar'
        : type === 'error'
        ? 'error-snackbar'
        : 'info-snackbar';

    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: [panelClass],
    });
  }

  limpiar(): void {
    this.form.reset();
    this.cuentasDebe.clear();
    this.cuentasHaber.clear();
    this.cuentasDebe.push(this.createCuentaGroup());
    this.cuentasHaber.push(this.createCuentaGroup());

    // Limpiar también los grids dinámicos
    this.cuentasDebeGrid = [];
    this.cuentasHaberGrid = [];

    this.calcularTotales();
    this.calcularTotalesGrid();

    this.codigoAsientoActual = null; // Resetear código para nueva creación
    this.asientoActual = null; // Resetear datos del asiento
  }

  /**
   * Convierte un código de estado numérico a texto descriptivo
   */
  getEstadoTexto(estado: number): string {
    const estados: { [key: number]: string } = {
      1: 'CONFIRMADO',
      2: 'ANULADO',
      3: 'CONTABILIZADO',
      4: 'INCOMPLETO',
    };
    return estados[estado] || 'DESCONOCIDO';
  }
  /**
   * Valida que las cuentas con datos estén completas (cuenta + valor > 0)
   */
  private validarCuentasConDatos(): { debe: boolean; haber: boolean; errors: string[] } {
    const errors: string[] = [];
    let debeValido = true;
    let haberValido = true;

    // Validar cuentas DEBE que tienen datos
    this.cuentasDebe.controls.forEach((control, index) => {
      const cuenta = control.get('cuenta')?.value;
      const valor = control.get('valor')?.value;

      if (cuenta || valor > 0) {
        // Si tiene cuenta o valor, ambos deben estar completos
        if (!cuenta) {
          errors.push(`Cuenta DEBE ${index + 1}: falta seleccionar cuenta`);
          debeValido = false;
        }
        if (!valor || valor <= 0) {
          errors.push(`Cuenta DEBE ${index + 1}: falta valor válido`);
          debeValido = false;
        }
      }
    });

    // Validar cuentas HABER que tienen datos
    this.cuentasHaber.controls.forEach((control, index) => {
      const cuenta = control.get('cuenta')?.value;
      const valor = control.get('valor')?.value;

      if (cuenta || valor > 0) {
        // Si tiene cuenta o valor, ambos deben estar completos
        if (!cuenta) {
          errors.push(`Cuenta HABER ${index + 1}: falta seleccionar cuenta`);
          haberValido = false;
        }
        if (!valor || valor <= 0) {
          errors.push(`Cuenta HABER ${index + 1}: falta valor válido`);
          haberValido = false;
        }
      }
    });

    return { debe: debeValido, haber: haberValido, errors };
  }

  /**
   * Parsea fechas del backend que pueden venir en diferentes formatos
   */
  private parseFechaFromBackend(fecha: any): Date {
    if (!fecha) {
      return new Date(); // Fecha actual por defecto
    }

    // Si ya es un Date válido
    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
      return fecha;
    }

    // Si es un string, intenta parsearlo
    if (typeof fecha === 'string') {
      // Manejar formato específico con Z[UTC]: 2025-12-16T00:00:00Z[UTC]
      const fechaLimpia = fecha.replace(/Z\[UTC\]$/, 'Z');
      const parsedDate = new Date(fechaLimpia);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // Si es un número (timestamp)
    if (typeof fecha === 'number') {
      return new Date(fecha);
    }

    // Si es un array [año, mes, día, hora, minuto, segundo, nanosegundos] (formato Java LocalDateTime)
    if (Array.isArray(fecha) && fecha.length >= 3) {
      // Nota: Los meses en JavaScript son 0-indexados, pero Java envía 1-indexados
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = fecha;
      // Convertir nanosegundos a milisegundos (dividir entre 1,000,000)
      const ms = Math.floor(nanoseconds / 1000000);
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }

    // Si es un objeto con propiedades de fecha
    if (typeof fecha === 'object' && fecha !== null) {
      if (fecha.year && fecha.month && fecha.day) {
        return new Date(fecha.year, fecha.month - 1, fecha.day);
      }
    }

    console.warn('⚠️ Formato de fecha no reconocido:', fecha);
    return new Date(); // Fallback a fecha actual
  }

  /**
   * Verifica si una cuenta requiere centro de costos basándose en su naturaleza
   */
  cuentaRequiereCentroCosto(cuenta: PlanCuenta): boolean {
    if (!cuenta || !cuenta.naturalezaCuenta) {
      return false;
    }

    // El campo manejaCentroCosto: 1 = Sí maneja, 0 = No maneja
    return cuenta.naturalezaCuenta.manejaCentroCosto === 1;
  }

  /**
   * Obtiene el nombre de la naturaleza de una cuenta
   */
  getNaturalezaCuentaNombre(cuenta: PlanCuenta): string {
    return cuenta?.naturalezaCuenta?.nombre || 'Sin naturaleza';
  }

  /**
   * Verifica si una fila del grid requiere centro de costos
   */
  filaRequiereCentroCosto(tipo: 'DEBE' | 'HABER', index: number): boolean {
    const formArray = tipo === 'DEBE' ? this.cuentasDebe : this.cuentasHaber;
    const control = formArray.at(index);
    const cuenta = control?.get('cuenta')?.value;

    return this.cuentaRequiereCentroCosto(cuenta);
  }

  /**
   * Obtiene todas las cuentas que requieren centro de costos en el asiento actual
   */
  getCuentasConCentroCosto(): { tipo: 'DEBE' | 'HABER'; index: number; cuenta: PlanCuenta }[] {
    const cuentasConCosto: { tipo: 'DEBE' | 'HABER'; index: number; cuenta: PlanCuenta }[] = [];

    // Verificar cuentas del DEBE
    this.cuentasDebe.controls.forEach((control, index) => {
      const cuenta = control.get('cuenta')?.value;
      if (cuenta && this.cuentaRequiereCentroCosto(cuenta)) {
        cuentasConCosto.push({ tipo: 'DEBE', index, cuenta });
      }
    });

    // Verificar cuentas del HABER
    this.cuentasHaber.controls.forEach((control, index) => {
      const cuenta = control.get('cuenta')?.value;
      if (cuenta && this.cuentaRequiereCentroCosto(cuenta)) {
        cuentasConCosto.push({ tipo: 'HABER', index, cuenta });
      }
    });

    return cuentasConCosto;
  }

  /**
   * Maneja la selección de una cuenta en el formulario
   */
  onCuentaSeleccionada(tipo: 'DEBE' | 'HABER', index: number, cuenta: PlanCuenta): void {
    if (!cuenta) return;

    console.log(
      `📊 Cuenta seleccionada ${tipo}[${index + 1}]:`,
      cuenta.cuentaContable,
      '-',
      cuenta.nombre
    );

    if (this.cuentaRequiereCentroCosto(cuenta)) {
      console.log(`🏢 Esta cuenta requiere centro de costos`);
      console.log(`   Naturaleza: ${this.getNaturalezaCuentaNombre(cuenta)}`);

      // Mostrar notificación al usuario
      const mensaje = `La cuenta "${cuenta.nombre}" requiere centro de costos`;
      this.snackBar.open(mensaje, 'Entendido', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['snackbar-warning'],
      });
    }
  }

  /**
   * Muestra información sobre las cuentas que requieren centro de costos
   */
  mostrarInfoCentroCostos(): void {
    const cuentasConCosto = this.getCuentasConCentroCosto();

    if (cuentasConCosto.length === 0) {
      console.log('ℹ️ Ninguna cuenta en este asiento requiere centro de costos');
      return;
    }

    console.group('🏢 Cuentas que requieren Centro de Costos:');
    cuentasConCosto.forEach(({ tipo, index, cuenta }) => {
      console.log(`${tipo} [${index + 1}]: ${cuenta.cuentaContable} - ${cuenta.nombre}`);
      console.log(`   Naturaleza: ${this.getNaturalezaCuentaNombre(cuenta)}`);
    });
    console.groupEnd();

    // Mostrar mensaje al usuario
    const mensaje = `${cuentasConCosto.length} cuenta(s) requieren centro de costos`;
    this.snackBar.open(mensaje, 'Ver detalles', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  /**
   * Valida que todas las cuentas con centro de costos tengan uno asignado
   */
  validarCentrosCostos(): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    // Validar cuentas del DEBE
    this.cuentasDebe.controls.forEach((control, index) => {
      const cuenta = control.get('cuenta')?.value;
      const centroCosto = control.get('centroCosto')?.value;

      if (cuenta && this.cuentaRequiereCentroCosto(cuenta) && !centroCosto) {
        errores.push(`DEBE [${index + 1}] "${cuenta.nombre}" requiere centro de costos`);
      }
    });

    // Validar cuentas del HABER
    this.cuentasHaber.controls.forEach((control, index) => {
      const cuenta = control.get('cuenta')?.value;
      const centroCosto = control.get('centroCosto')?.value;

      if (cuenta && this.cuentaRequiereCentroCosto(cuenta) && !centroCosto) {
        errores.push(`HABER [${index + 1}] "${cuenta.nombre}" requiere centro de costos`);
      }
    });

    return {
      valido: errores.length === 0,
      errores,
    };
  }

  /**
   * Obtiene información de centros de costo asignados en el asiento
   */
  getCentrosCostoAsignados(): {
    tipo: 'DEBE' | 'HABER';
    index: number;
    cuenta: PlanCuenta;
    centroCosto: CentroCosto;
  }[] {
    const centrosAsignados: {
      tipo: 'DEBE' | 'HABER';
      index: number;
      cuenta: PlanCuenta;
      centroCosto: CentroCosto;
    }[] = [];

    // Revisar cuentas del DEBE
    this.cuentasDebe.controls.forEach((control, index) => {
      const cuenta = control.get('cuenta')?.value;
      const centroCosto = control.get('centroCosto')?.value;

      if (cuenta && centroCosto) {
        centrosAsignados.push({ tipo: 'DEBE', index, cuenta, centroCosto });
      }
    });

    // Revisar cuentas del HABER
    this.cuentasHaber.controls.forEach((control, index) => {
      const cuenta = control.get('cuenta')?.value;
      const centroCosto = control.get('centroCosto')?.value;

      if (cuenta && centroCosto) {
        centrosAsignados.push({ tipo: 'HABER', index, cuenta, centroCosto });
      }
    });

    return centrosAsignados;
  }

  /**
   * Crea un nuevo asiento limpiando el formulario
   */
  nuevoAsiento(): void {
    console.log('🆕 Creando nuevo asiento...');

    // Limpiar el estado actual
    this.codigoAsientoActual = null;
    this.detallesOriginales = [];

    // Reinicializar el formulario
    this.initializeForm();

    // Limpiar los arrays de cuentas del grid
    this.cuentasDebeGrid = [];
    this.cuentasHaberGrid = [];

    // Resetear totales
    this.totalDebe = 0;
    this.totalHaber = 0;
    this.diferencia = 0;

    // Navegar a la URL sin parámetros para un nuevo asiento
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });

    this.showMessage('✅ Listo para crear un nuevo asiento', 'success');

    console.log('✅ Nuevo asiento iniciado correctamente');
  }

  /**
   * Determina si un centro de costo puede ser seleccionado (solo Movimiento)
   */
  isCentroSeleccionable(centro: CentroCosto): boolean {
    return centro.tipo === 2; // Solo centros de Movimiento
  }

  /**
   * Obtiene el texto descriptivo del tipo de centro
   */
  getTipoTexto(tipo: number): string {
    return tipo === 1 ? 'Acumulación' : 'Movimiento';
  }

  /**
   * Validar selección de centro de costo
   */
  onCentroSelected(centroId: number | null, tipo: 'DEBE' | 'HABER', index: number): void {
    if (centroId) {
      const centro = this.centrosCosto.find((c) => c.codigo === centroId);
      if (centro && centro.tipo === 1) {
        // Si seleccionó un centro de Acumulación, mostrar error y limpiar selección
        this.showMessage(
          `El centro "${centro.nombre}" es de tipo Acumulación. Solo se pueden seleccionar centros de Movimiento.`,
          'error'
        );

        // Limpiar la selección según el tipo
        if (tipo === 'DEBE') {
          const control = this.cuentasDebe.at(index);
          control?.get('centroCosto')?.setValue(null);
        } else {
          const control = this.cuentasHaber.at(index);
          control?.get('centroCosto')?.setValue(null);
        }
        return;
      }
    }
  }

  /**
   * Construir ruta jerárquica para un centro de costo con indicador de tipo
   */
  buildRutaJerarquicaCentro(centro: CentroCosto): string {
    const tipoTexto = centro.tipo === 1 ? '[ACUM]' : '[MOV]';
    return `${centro.nombre} ${tipoTexto}`;
  }

  /**
   * Configurar autocomplete para una fila específica de DEBE
   */
  configurarAutocompleteDebe(index: number): void {
    const control = this.cuentasDebe.at(index).get('cuentaBusqueda');
    if (control) {
      this.cuentasFiltradasDebe[index] = control.valueChanges.pipe(
        startWith(''),
        map(value => this._filtrarCuentas(value || ''))
      );
    }
  }

  /**
   * Configurar autocomplete para una fila específica de HABER
   */
  configurarAutocompleteHaber(index: number): void {
    const control = this.cuentasHaber.at(index).get('cuentaBusqueda');
    if (control) {
      this.cuentasFiltradasHaber[index] = control.valueChanges.pipe(
        startWith(''),
        map(value => this._filtrarCuentas(value || ''))
      );
    }
  }

  /**
   * Filtrar cuentas por número o nombre (búsqueda flexible)
   */
  private _filtrarCuentas(busqueda: string | PlanCuenta): PlanCuenta[] {
    // Si es un objeto PlanCuenta (selección), mostrar todas
    if (typeof busqueda === 'object' && busqueda !== null) {
      return this.cuentasPlan;
    }

    // Si es string vacío, mostrar todas
    if (!busqueda || busqueda.trim() === '') {
      return this.cuentasPlan;
    }

    const filtro = busqueda.toLowerCase().trim();

    return this.cuentasPlan.filter(cuenta => {
      const numeroCoincide = cuenta.cuentaContable?.toLowerCase().includes(filtro);
      const nombreCoincide = cuenta.nombre?.toLowerCase().includes(filtro);
      return numeroCoincide || nombreCoincide;
    });
  }

  /**
   * Mostrar nombre de cuenta en el autocomplete
   */
  displayCuenta(cuenta: PlanCuenta | null): string {
    if (!cuenta) return '';
    return `${cuenta.cuentaContable} - ${cuenta.nombre}`;
  }

  /**
   * Cuando se selecciona una cuenta del autocomplete
   */
  onCuentaAutocompleteSeleccionada(tipo: 'DEBE' | 'HABER', index: number, cuenta: PlanCuenta | null): void {
    if (cuenta) {
      // Actualizar el control de cuenta
      const formArray = tipo === 'DEBE' ? this.cuentasDebe : this.cuentasHaber;
      const control = formArray.at(index);
      control.get('cuenta')?.setValue(cuenta);

      // Llamar al handler existente
      this.onCuentaSeleccionada(tipo, index, cuenta);
    }
  }

  /**
   * Abre el dialog de búsqueda avanzada de cuentas
   */
  abrirBusquedaAvanzadaCuenta(tipo: 'DEBE' | 'HABER', index: number): void {
    const formArray = tipo === 'DEBE' ? this.cuentasDebe : this.cuentasHaber;
    const control = formArray.at(index);
    const cuentaActual = control.get('cuenta')?.value;

    const dialogRef = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '900px',
      maxHeight: '85vh',
      data: {
        cuentaPreseleccionada: cuentaActual,
        titulo: `Seleccionar Cuenta para ${tipo}`,
        mostrarSoloMovimiento: true
      },
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe((cuentaSeleccionada: PlanCuenta | null) => {
      if (cuentaSeleccionada) {
        // Actualizar el control de cuenta
        control.get('cuenta')?.setValue(cuentaSeleccionada);

        // Actualizar el campo de búsqueda del autocomplete
        control.get('cuentaBusqueda')?.setValue(cuentaSeleccionada);

        // Llamar al handler existente para procesar la cuenta seleccionada
        this.onCuentaSeleccionada(tipo, index, cuentaSeleccionada);
      }
    });
  }
}
