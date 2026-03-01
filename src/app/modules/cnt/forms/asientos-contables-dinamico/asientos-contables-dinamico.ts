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
  Validators,
} from '@angular/forms';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
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
import { ConfirmDialogComponent } from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { JasperReportesService } from '../../../../shared/services/jasper-reportes.service';
import { SubdetalleAsientoService } from '../../service/subdetalle-asiento.service';
import {
  SubdetalleAsientoDialogComponent,
  SubdetalleItem,
  SubdetalleDialogResult,
} from '../../dialog/subdetalle-asiento-dialog/subdetalle-asiento-dialog.component';

const RUBRO_MODULOS_SISTEMA = 15;
const RUBRO_MODULO_CNT = 1;

interface CuentaItem {
  cuenta: PlanCuenta | null;
  valor: number;
  tipo: 'DEBE' | 'HABER';
  centroCosto?: CentroCosto | null; // Centro de costo asociado
  id?: string; // Para trackear items únicos en el grid (temporal)
  codigoDetalle?: number; // Código del detalle en BD (para updates)
  descripcion?: string; // Descripción del detalle (editable por usuario)
  subdetalles?: SubdetalleItem[]; // Subdetalles de activo fijo pendientes de guardar
  subdetallesEliminados?: number[]; // Códigos de subdetalles a eliminar al grabar
}

@Component({
  selector: 'app-asientos-contables-dinamico',
  standalone: true,
  imports: [
    CommonModule,
    MaterialFormModule,
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
  vieneDesdeReporte = false; // Para mostrar botón de regreso
  hayDetallesSinGuardar = false; // Control para habilitar/deshabilitar botones

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
  estadosAsientos: any[] = []; // Estados cargados desde detalleRubro

  // Constantes de rubros
  private readonly RUBRO_TIPO_ASIENTO = 15;
  private readonly RUBRO_ESTADO_ASIENTO = 21;

  // Columnas para mat-table
  displayedColumns: string[] = ['cuenta', 'valor', 'acciones'];

  // Grid de detalles del asiento
  detalleDataSource = new MatTableDataSource<any>([]);
  detalleColumns: string[] = ['cuenta', 'descripcion', 'centroCosto', 'debe', 'haber', 'tipo', 'acciones'];

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
    private router: Router,
    private jasperReportes: JasperReportesService,
    private subdetalleAsientoService: SubdetalleAsientoService
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
   * Verifica si se debe cargar un asiento existente desde query params o route params
   */
  private verificarCargaAsiento(): void {
    // Primero verificar parámetros de ruta (/asientos-dinamico/:id)
    this.route.params.subscribe((params) => {
      const asientoId = params['id'];
      if (asientoId) {
        this.cargarAsientoPorId(parseInt(asientoId, 10), 'edit');
        return;
      }
    });

    // Si no hay parámetro de ruta, verificar query params (?id=123&mode=edit)
    this.route.queryParams.subscribe((params) => {
      const asientoId = params['id'];
      const mode = params['mode'];
      const fromReport = params['fromReport'];

      // Detectar si viene desde reporte
      if (fromReport === 'true') {
        this.vieneDesdeReporte = true;
      }

      if (asientoId) {
        this.cargarAsientoPorId(parseInt(asientoId, 10), mode);
      }
    });
  }

  private cargarRubros(): void {
    // Cargar estados de asientos
    this.cargarEstadosAsientos();

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
        }
      },
      error: (err) => {
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
            resolve();
          } else {
            this.cuentasPlan = [];
            resolve();
          }
        },
        error: (err) => {
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
          } else {            this.centrosCosto = [];
          }
          resolve();
        },
        error: (err: any) => {
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

    // Usar getById para recuperar por clave primaria
    this.asientoService.getById(id).subscribe({
      next: (asiento: Asiento) => {
        if (asiento) {
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

          // Solo permitir edición si el asiento está INCOMPLETO (4)
          if (asiento.estado !== 4) {
            this.deshabilitarFormulario();
          }

          if (mode === 'view') {
            // Deshabilitar formulario para solo lectura
            this.form.disable();
            this.showMessage('Asiento cargado en modo solo lectura', 'info');
          } else {
            // Mensaje según el estado
            if (asiento.estado === 1) {
              this.showMessage(`Asiento ${asiento.numero} cargado - ACTIVO (solo consulta)`, 'info');
            } else if (asiento.estado === 2) {
              this.showMessage(`Asiento ${asiento.numero} cargado - ANULADO (solo consulta)`, 'info');
            } else {
              this.showMessage(`Asiento ${asiento.numero} cargado para edición`, 'success');
            }
          }
        } else {
          this.loading = false;
          this.showMessage(`No se encontró el asiento con ID ${id}`, 'error');
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al cargar el asiento:', err);
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
                codigoDetalle: detalle.codigo, // IMPORTANTE: Guardar el código del detalle de BD
                descripcion: detalle.descripcion || '', // Cargar descripción del detalle
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
            } else {            }
          });

          if (detallesProcesados === 0) {
            this.showMessage('El asiento no tiene detalles válidos', 'info');
          }
        } else {
          this.showMessage('Este asiento no tiene detalles asociados', 'info');
        }

        // Recalcular totales y actualizar grid de detalles siempre
        // Cargar subdetalles existentes en paralelo para mostrar badges
        const todosItems = [...this.cuentasDebeGrid, ...this.cuentasHaberGrid];
        const itemsConDetalle = todosItems.filter((i) => !!i.codigoDetalle);

        const finalizarCarga = () => {
          this.calcularTotalesGrid();
          this.hayDetallesSinGuardar = false;
          console.log('🔍 Estado después de cargar detalles:', {
            hayDetallesSinGuardar: this.hayDetallesSinGuardar,
            asientoCuadrado: this.asientoCuadrado,
            totalDebe: this.totalDebe,
            totalHaber: this.totalHaber,
            diferencia: this.diferencia,
            estado: this.form.get('estado')?.value
          });
          this.loading = false;
        };

        if (itemsConDetalle.length === 0) {
          finalizarCarga();
          return;
        }

        let subsCargados = 0;
        itemsConDetalle.forEach((itemDet) => {
          const crit = new DatosBusqueda();
          crit.asignaValorConCampoPadre(
            TipoDatosBusqueda.LONG,
            'detalleAsiento',
            'codigo',
            String(itemDet.codigoDetalle),
            TipoComandosBusqueda.IGUAL
          );
          this.subdetalleAsientoService.selectByCriteria([crit]).subscribe({
            next: (subs: any) => {
              itemDet.subdetalles = (subs ?? []).map((s: any) => ({
                _codigo: s.codigo,
                codigoActivo: s.codigoActivo ?? '',
                nombreBien: s.nombreBien ?? '',
                categoria: s.categoria ?? '',
                tipo: s.tipo ?? '',
                fechaAdquisicion: s.fechaAdquisicion ?? '',
                costoAdquisicion: s.costoAdquisicion ?? null,
                mejorasCapitalizadas: s.mejorasCapitalizadas ?? null,
                valorResidual: s.valorResidual ?? null,
                baseDepreciar: s.baseDepreciar ?? null,
                vidaUtilTotal: s.vidaUtilTotal ?? null,
                vidaUtilRemanente: s.vidaUtilRemanente ?? null,
                porcentajeDepreciacion: s.porcentajeDepreciacion ?? null,
                cuotaDepreciacion: s.cuotaDepreciacion ?? null,
                depreciacionAcumulada: s.depreciacionAcumulada ?? null,
                valorNetoLibros: s.valorNetoLibros ?? null,
                ubicacionGeneral: s.ubicacionGeneral ?? '',
                ubicacionEspecifica: s.ubicacionEspecifica ?? '',
                responsable: s.responsable ?? '',
                estadoFisico: s.estadoFisico ?? '',
                factura: s.factura ?? '',
                observaciones: s.observaciones ?? '',
              } as SubdetalleItem));
              subsCargados++;
              if (subsCargados === itemsConDetalle.length) finalizarCarga();
            },
            error: () => {
              subsCargados++;
              if (subsCargados === itemsConDetalle.length) finalizarCarga();
            },
          });
        });
      },
      error: (err) => {
        this.loading = false;
        this.showMessage('Error al cargar los detalles del asiento', 'error');
      },
    });
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      tipo: ['', [Validators.required]],
      numero: [''], // Sin validación, generado por backend
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
      descripcion: [''], // Descripción del detalle (inicialmente nombre de la cuenta)
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

    // Marcar que hay detalles sin guardar - desactiva botón Confirmar Asiento
    console.log('agregarCuentaDebe - ANTES: hayDetallesSinGuardar =', this.hayDetallesSinGuardar);
    this.hayDetallesSinGuardar = true;
    console.log('agregarCuentaDebe - DESPUÉS: hayDetallesSinGuardar =', this.hayDetallesSinGuardar);

    // Configurar autocomplete para la nueva fila
    setTimeout(() => this.configurarAutocompleteDebe(index), 0);
  }

  agregarCuentaHaber(): void {
    const index = this.cuentasHaber.length;
    this.cuentasHaber.push(this.createCuentaGroup());

    // Marcar que hay detalles sin guardar - desactiva botón Confirmar Asiento
    console.log('agregarCuentaHaber - ANTES: hayDetallesSinGuardar =', this.hayDetallesSinGuardar);
    this.hayDetallesSinGuardar = true;
    console.log('agregarCuentaHaber - DESPUÉS: hayDetallesSinGuardar =', this.hayDetallesSinGuardar);

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
    const descripcion = ultimoControl.get('descripcion')?.value;

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
      descripcion: descripcion || cuenta.nombre || '', // Usar descripcion o nombre de cuenta
    };

    if (tipo === 'DEBE') {
      this.cuentasDebeGrid.push(nuevaCuenta);
    } else {
      this.cuentasHaberGrid.push(nuevaCuenta);
    }

    // Marcar que hay detalles sin guardar - desactiva botón Confirmar Asiento
    console.log('agregarCuentaAlGrid - ANTES: hayDetallesSinGuardar =', this.hayDetallesSinGuardar);
    this.hayDetallesSinGuardar = true;
    console.log('agregarCuentaAlGrid - DESPUÉS: hayDetallesSinGuardar =', this.hayDetallesSinGuardar);

    // Limpiar el formulario
    ultimoControl.patchValue({
      cuenta: null,
      cuentaBusqueda: '', // Limpiar también el campo de búsqueda
      valor: 0,
      centroCosto: null,
      descripcion: '' // Limpiar también la descripción
    });

    this.calcularTotalesGrid();
  }

  /**
   * Calcular totales desde los grids
   */
  calcularTotalesGrid(): void {
    this.totalDebe = this.cuentasDebeGrid.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
    this.totalHaber = this.cuentasHaberGrid.reduce((sum, item) => sum + (Number(item.valor) || 0), 0);
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

      // Marcar que hay cambios sin guardar
      this.hayDetallesSinGuardar = true;
    }
  }

  /**
   * Editar valor de cuenta en el grid
   */
  editarValorGrid(item: CuentaItem, nuevoValor: number | string): void {
    const valorNumerico = Number(nuevoValor);
    if (valorNumerico > 0) {
      item.valor = valorNumerico;
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

    // Determinar el estado del asiento (mantener en INCOMPLETO hasta confirmación manual)
    let estadoAsiento = this.form.get('estado')?.value || this.asientoActual?.estado || 4;

    const asientoBackend: any = {
      empresa: {
        codigo: this.idSucursal,
      },
      tipoAsiento: {
        codigo: tipo?.value,
        nombre: tipoAsientoSeleccionado?.nombre || '',
      },
      numero: parseInt(numero?.value, 10),
      fechaAsiento: fechaAsiento,
      observaciones: this.form.get('observaciones')?.value?.trim() || '',
      estado: estadoAsiento,
      nombreUsuario: localStorage.getItem('username') || 'sistema',
      fechaIngreso: new Date(),
      numeroMes: fechaAsiento ? fechaAsiento.getMonth() + 1 : new Date().getMonth() + 1,
      numeroAnio: fechaAsiento ? fechaAsiento.getFullYear() : new Date().getFullYear(),
      moneda: 1,
      rubroModuloClienteP: RUBRO_MODULOS_SISTEMA,    // Código alterno del rubro de módulos del sistema
      rubroModuloClienteH: RUBRO_MODULO_CNT,     // Código alterno del módulo de contabilidad
      rubroModuloSistemaP: RUBRO_MODULOS_SISTEMA,    // Código alterno del rubro de módulos del sistema
      rubroModuloSistemaH: RUBRO_MODULO_CNT,     // Código alterno del módulo de contabilidad
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
          this.asientoActual = response;

          // Actualizar el número en el formulario
          if (response.numero) {
            this.form.patchValue({ numero: response.numero });
          }
        }

        // Actualizar el estado en el formulario si cambió a ACTIVO
        if (estadoAsiento === 1) {
          this.form.patchValue({ estado: 1 });
        }

        let mensaje = this.codigoAsientoActual
          ? `Cabecera del Asiento #${response.numero} actualizada exitosamente`
          : `Cabecera del Asiento #${response.numero} guardada exitosamente`;

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
        this.snackBar.open(`Error al guardar cabecera: ${errorMsg}`, 'Cerrar', {
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
    if (validacionCuentas.errors.length > 0) {      this.snackBar.open(
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
    if (this.diferencia !== 0) {      this.snackBar.open(
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
      error: (error) => {        this.loading = false;
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
    if (!this.codigoAsientoActual) {      this.loading = false;
      return;
    }    this.grabarDetallesDelAsiento(this.codigoAsientoActual);
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
          descripcion: item.descripcion || item.cuenta.nombre || '',
          nombreCuenta: item.cuenta.nombre || '',
          numeroCuenta: item.cuenta.cuentaContable || '',
          _itemRef: item,
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
          descripcion: item.descripcion || item.cuenta.nombre || '',
          nombreCuenta: item.cuenta.nombre || '',
          numeroCuenta: item.cuenta.cuentaContable || '',
          _itemRef: item,
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
        const descripcion = control.get('descripcion')?.value;

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
            descripcion: descripcion || cuenta.nombre || '',
            nombreCuenta: cuenta.nombre || '',
            numeroCuenta: cuenta.cuentaContable || '',
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
        const descripcion = control.get('descripcion')?.value;

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
            descripcion: descripcion || cuenta.nombre || '',
            nombreCuenta: cuenta.nombre || '',
            numeroCuenta: cuenta.cuentaContable || '',
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
    // Grabar cada detalle usando el servicio correspondiente
    let completados = 0;
    const erroresDetalle: string[] = [];

    const checkFinalizacion = () => {
      completados++;
      if (completados === detallesParaGrabar.length) {
        this.loading = false;
        const msg =
          erroresDetalle.length === 0
            ? `✅ ${completados} detalles del asiento grabados exitosamente`
            : `⚠️ Detalles grabados con errores: ${erroresDetalle.join(', ')}`;
        this.snackBar.open(msg, 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: erroresDetalle.length === 0 ? ['success-snackbar'] : ['warning-snackbar'],
        });
        // Recargar detalles para mostrar los cambios
        this.cargarDetallesAsiento(asientoId);
        // Verificar si el asiento quedó descuadrado y actualizar estado si es necesario
        this.verificarYActualizarEstadoAsiento(asientoId);
      }
    };

    detallesParaGrabar.forEach((detalle) => {
      const itemRef: CuentaItem | undefined = detalle._itemRef;
      const payload = { ...detalle };
      delete payload._itemRef;

      this.detalleAsientoService.add(payload).subscribe({
        next: (response: any) => {
          const subdetallesPendientes: SubdetalleItem[] = itemRef?.subdetalles ?? [];
          if (subdetallesPendientes.length > 0 && response?.codigo) {
            this.guardarSubdetalles(
              subdetallesPendientes,
              [],
              response.codigo,
              erroresDetalle,
              checkFinalizacion
            );
          } else {
            checkFinalizacion();
          }
        },
        error: (error: any) => {
          erroresDetalle.push(`Detalle: ${error?.message || 'Desconocido'}`);
          checkFinalizacion();
        },
      });
    });
  }

  /**
   * Actualiza los detalles existentes de un asiento
   */
  private actualizarDetallesDelAsiento(asientoId: number): void {
    // Recopilar detalles actuales del grid
    const detallesActuales = this.recopilarDetallesDelGrid(asientoId);

    // Si no hay detalles actuales Y tampoco hay detalles originales, no hay nada que hacer
    if (detallesActuales.length === 0 && this.detallesOriginales.length === 0) {
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
          codigo: item.codigoDetalle, // Incluir código si existe (para updates)
          asiento: { codigo: asientoId },
          planCuenta: { codigo: item.cuenta.codigo },
          descripcion: item.descripcion || '',
          valorDebe: item.valor,
          valorHaber: 0,
          nombreCuenta: item.cuenta.nombre || '',
          numeroCuenta: item.cuenta.cuentaContable || '',
          centroCosto: item.centroCosto ? { codigo: item.centroCosto.codigo } : null,
          _itemRef: item,
        });
      }
    });

    // Procesar cuentas HABER
    this.cuentasHaberGrid.forEach((item) => {
      if (item && item.cuenta && item.valor > 0) {
        detalles.push({
          codigo: item.codigoDetalle, // Incluir código si existe (para updates)
          asiento: { codigo: asientoId },
          planCuenta: { codigo: item.cuenta.codigo },
          descripcion: item.descripcion || '',
          valorDebe: 0,
          valorHaber: item.valor,
          nombreCuenta: item.cuenta.nombre || '',
          numeroCuenta: item.cuenta.cuentaContable || '',
          centroCosto: item.centroCosto ? { codigo: item.centroCosto.codigo } : null,
          _itemRef: item,
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
      // Si tiene codigo, es un detalle existente (buscar por codigo)
      if (detalleActual.codigo) {
        const detalleOriginal = this.detallesOriginales.find(
          (orig) => orig.codigo === detalleActual.codigo
        );

        if (detalleOriginal) {
          // Verificar si cambió algún valor
          const valorOriginalDebe = detalleOriginal.valorDebe || 0;
          const valorOriginalHaber = detalleOriginal.valorHaber || 0;
          const valorActualDebe = detalleActual.valorDebe || 0;
          const valorActualHaber = detalleActual.valorHaber || 0;

          // También incluir en actualizar si tiene subdetalles nuevos, editados o eliminados
          const tieneNuevosSubdetalles = (detalleActual._itemRef?.subdetalles ?? []).some(
            (s: any) => !s._codigo
          );
          const tieneSubdetallesExistentes = (detalleActual._itemRef?.subdetalles ?? []).some(
            (s: any) => !!s._codigo
          );
          const tieneSubdetallesEliminados =
            (detalleActual._itemRef?.subdetallesEliminados ?? []).length > 0;

          if (valorOriginalDebe !== valorActualDebe ||
              valorOriginalHaber !== valorActualHaber ||
              detalleOriginal.descripcion !== detalleActual.descripcion ||
              tieneNuevosSubdetalles ||
              tieneSubdetallesExistentes ||
              tieneSubdetallesEliminados) {
            operaciones.actualizar.push(detalleActual);
          }
          // Si no cambió nada, no hacer nada (mantener como está)
        } else {
          // Tiene codigo pero no está en originales (caso extraño, tratarlo como update)
          operaciones.actualizar.push(detalleActual);
        }
      } else {
        // No tiene codigo, es un nuevo detalle
        operaciones.crear.push(detalleActual);
      }
    });

    // Buscar detalles eliminados (estaban en originales pero no en actuales)
    this.detallesOriginales.forEach((detalleOriginal) => {
      const existe = detallesActuales.find(
        (actual) => actual.codigo && actual.codigo === detalleOriginal.codigo
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
    if (totalOperaciones === 0) {      this.loading = false;
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

          // IMPORTANTE: hayDetallesSinGuardar se resetea en cargarDetallesAsiento()
          // No lo reseteamos aquí para evitar que aparezca el botón antes de tiempo
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
      const itemRef: CuentaItem | undefined = detalle._itemRef;
      const payload = { ...detalle };
      delete payload._itemRef;

      this.detalleAsientoService.add(payload).subscribe({
        next: (response: any) => {
          const subdetallesPendientes: SubdetalleItem[] = itemRef?.subdetalles ?? [];
          if (subdetallesPendientes.length > 0 && response?.codigo) {
            this.guardarSubdetalles(subdetallesPendientes, [], response.codigo, errores, verificarComplecion);
          } else {
            verificarComplecion();
          }
        },
        error: (error) => {
          errores.push(`Error creando: ${error?.message || 'Desconocido'}`);          verificarComplecion();
        },
      });
    });

    // Ejecutar actualizaciones
    operaciones.actualizar.forEach((detalle: any) => {
      const itemRef: CuentaItem | undefined = detalle._itemRef;
      const payload = { ...detalle };
      delete payload._itemRef;

      this.detalleAsientoService.update(payload).subscribe({
        next: () => {
          // Pasar TODOS los subdetalles: guardarSubdetalles ya distingue add (sin _codigo) vs update (con _codigo)
          const todosSubdetalles: SubdetalleItem[] = itemRef?.subdetalles ?? [];
          const subdetallesAEliminar: number[] = itemRef?.subdetallesEliminados ?? [];
          const hayOpsSub =
            (todosSubdetalles.length > 0 || subdetallesAEliminar.length > 0) && payload.codigo;
          if (hayOpsSub) {
            this.guardarSubdetalles(
              todosSubdetalles,
              subdetallesAEliminar,
              payload.codigo,
              errores,
              verificarComplecion
            );
          } else {
            verificarComplecion();
          }
        },
        error: (error) => {
          errores.push(`Error actualizando: ${error?.message || 'Desconocido'}`);          verificarComplecion();
        },
      });
    });

    // Ejecutar eliminaciones
    operaciones.eliminar.forEach((detalle: any) => {
      this.detalleAsientoService.delete(detalle.codigo).subscribe({
        next: () => {          verificarComplecion();
        },
        error: (error) => {
          errores.push(`Error eliminando: ${error?.message || 'Desconocido'}`);          verificarComplecion();
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
        descripcion: cuenta.descripcion || cuenta.cuenta?.nombre || '',
        centroCosto: cuenta.centroCosto
          ? `${cuenta.centroCosto.numero} - ${cuenta.centroCosto.nombre}`
          : '',
        debe: cuenta.valor,
        haber: 0,
        tipo: 'DEBE',
        itemRef: cuenta,
        subdetalleCount: cuenta.subdetalles?.length ?? 0,
      });
    });

    // Agregar cuentas haber
    this.cuentasHaberGrid.forEach((cuenta) => {
      detalles.push({
        cuenta: cuenta.cuenta?.cuentaContable || '',
        descripcion: cuenta.descripcion || cuenta.cuenta?.nombre || '',
        centroCosto: cuenta.centroCosto
          ? `${cuenta.centroCosto.numero} - ${cuenta.centroCosto.nombre}`
          : '',
        debe: 0,
        haber: cuenta.valor,
        tipo: 'HABER',
        itemRef: cuenta,
        subdetalleCount: cuenta.subdetalles?.length ?? 0,
      });
    });

    this.detalleDataSource.data = detalles;
  }

  /**
   * Verifica si el asiento está descuadrado y actualiza el estado a INCOMPLETO si es necesario
   */
  private verificarYActualizarEstadoAsiento(asientoId: number): void {
    // Calcular totales actuales
    const debe = this.totalDebe;
    const haber = this.totalHaber;
    const diferencia = Math.abs(debe - haber);

    // Si el asiento está descuadrado y el estado actual es ACTIVO (1)
    if (diferencia !== 0 && this.form.get('estado')?.value === 1) {
      // Construir objeto para actualizar solo el estado
      const asientoActualizado: any = {
        codigo: asientoId,
        empresa: {
          codigo: this.idSucursal,
        },
        estado: 4, // INCOMPLETO
      };

      // Incluir campos requeridos del asiento actual
      if (this.asientoActual) {
        asientoActualizado.tipoAsiento = {
          codigo: this.asientoActual.tipoAsiento?.codigo,
        };
        asientoActualizado.numero = this.asientoActual.numero;
        asientoActualizado.fechaAsiento = this.asientoActual.fechaAsiento;
        asientoActualizado.observaciones = this.asientoActual.observaciones || '';
        asientoActualizado.nombreUsuario = this.asientoActual.nombreUsuario || 'sistema';
        asientoActualizado.fechaIngreso = this.asientoActual.fechaIngreso;
        asientoActualizado.numeroMes = this.asientoActual.numeroMes;
        asientoActualizado.numeroAnio = this.asientoActual.numeroAnio;
        asientoActualizado.moneda = this.asientoActual.moneda || 1;
        asientoActualizado.rubroModuloClienteP = this.asientoActual.rubroModuloClienteP || 0;
        asientoActualizado.rubroModuloClienteH = this.asientoActual.rubroModuloClienteH || 0;
        asientoActualizado.rubroModuloSistemaP = this.asientoActual.rubroModuloSistemaP || 0;
        asientoActualizado.rubroModuloSistemaH = this.asientoActual.rubroModuloSistemaH || 0;

        if (this.asientoActual.periodo) {
          asientoActualizado.periodo = {
            codigo: this.asientoActual.periodo.codigo,
          };
        }
      }

      // Actualizar el asiento
      this.asientoService.actualizarAsiento(asientoId, asientoActualizado).subscribe({
        next: () => {
          // Actualizar el estado en el formulario
          this.form.patchValue({ estado: 4 });

          this.snackBar.open(
            `⚠️ Asiento descuadrado. Estado cambiado a INCOMPLETO (Debe: $${debe.toFixed(2)} - Haber: $${haber.toFixed(2)})`,
            'Cerrar',
            {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['warning-snackbar'],
            }
          );
        },
        error: (error) => {        }
      });
    }
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
   * Cargar estados de asientos desde detalleRubro
   */
  private cargarEstadosAsientos(): void {
    // Verificar si los datos están cargados
    if (!this.detalleRubroService.estanDatosCargados()) {
      console.warn('DetalleRubros no están cargados aún');
      // Usar estados por defecto
      this.estadosAsientos = [
        { codigo: 1, nombre: 'CONFIRMADO' },
        { codigo: 2, nombre: 'ANULADO' },
        { codigo: 3, nombre: 'REVERSADO' },
        { codigo: 4, nombre: 'INCOMPLETO' }
      ];
      return;
    }

    // Obtener detalles del rubro de estados de asientos (código alterno 21)
    const detalles = this.detalleRubroService.getDetallesByParent(this.RUBRO_ESTADO_ASIENTO);

    if (detalles && detalles.length > 0) {
      this.estadosAsientos = detalles.map(detalle => ({
        codigo: detalle.codigoAlterno,
        nombre: detalle.descripcion
      }));
    } else {
      console.warn('No se encontraron estados de asientos en rubro 21');
      // Usar estados por defecto
      this.estadosAsientos = [
        { codigo: 1, nombre: 'CONFIRMADO' },
        { codigo: 2, nombre: 'ANULADO' },
        { codigo: 3, nombre: 'REVERSADO' },
        { codigo: 4, nombre: 'INCOMPLETO' }
      ];
    }
  }

  /**
   * Convierte un código de estado numérico a texto descriptivo
   */
  getEstadoTexto(estado: number): string {
    const estadoEncontrado = this.estadosAsientos.find(e => e.codigo === estado);
    return estadoEncontrado ? estadoEncontrado.nombre : 'DESCONOCIDO';
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
    }    return new Date(); // Fallback a fecha actual
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
    // Obtener el FormGroup correspondiente
    const formArray = tipo === 'DEBE' ? this.cuentasDebe : this.cuentasHaber;
    const cuentaGroup = formArray.at(index) as FormGroup;

    // Llenar automáticamente la descripción con el nombre de la cuenta
    // El usuario podrá editarlo después
    cuentaGroup.patchValue({
      descripcion: cuenta.nombre || '',
      cuenta: cuenta // Asegurar que la cuenta está asignada
    });

    if (this.cuentaRequiereCentroCosto(cuenta)) {
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

    if (cuentasConCosto.length === 0) {      return;
    }    cuentasConCosto.forEach(({ tipo, index, cuenta }) => {    });
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
    // Limpiar el estado actual
    this.codigoAsientoActual = null;
    this.asientoActual = null;
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

    // Actualizar el grid de detalles
    this.actualizarGridDetalles();

    // Navegar a la URL base sin parámetros para un nuevo asiento
    this.router.navigate(['/menucontabilidad/procesos/asientos-dinamico'], {
      replaceUrl: true,
    });

    this.showMessage('✅ Listo para crear un nuevo asiento', 'success');  }

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

  /**
   * Verificar si el asiento está cuadrado (listo para confirmar)
   */
  get asientoCuadrado(): boolean {
    return this.diferencia === 0 && this.totalDebe > 0 && this.totalHaber > 0;
  }

  /**
   * Verificar si el asiento está en estado ACTIVO (confirmado)
   */
  get asientoActivo(): boolean {
    const estado = this.form.get('estado')?.value;
    return estado === 1;
  }

  /**
   * Verificar si el asiento está en estado ANULADO
   */
  get asientoAnulado(): boolean {
    const estado = this.form.get('estado')?.value;
    return estado === 2;
  }

  /**
   * Verificar si el asiento está en estado REVERSADO
   */
  get asientoReversado(): boolean {
    const estado = this.form.get('estado')?.value;
    return estado === 3;
  }

  /**
   * Determinar si el botón "Confirmar Asiento" debe estar habilitado
   * Solo habilitado si:
   * - El asiento está cuadrado
   * - No hay detalles sin guardar
   * - El asiento está en estado INCOMPLETO (no activo ni anulado)
   */
  get puedeConfirmarAsiento(): boolean {
    return this.asientoCuadrado && !this.hayDetallesSinGuardar && !this.asientoActivo && !this.asientoAnulado;
  }

  /**
   * Determinar si el botón "Actualizar Detalle" debe estar habilitado
   * Habilitado cuando hay detalles sin guardar o cuando hay cambios en el grid
   */
  get puedeActualizarDetalle(): boolean {
    return this.hayDetallesSinGuardar || (this.cuentasDebeGrid.length + this.cuentasHaberGrid.length > 0);
  }

  /**
   * Confirmar el asiento (cambiar de INCOMPLETO a ACTIVO)
   * Solo disponible cuando el asiento está cuadrado
   */
  confirmarAsiento(): void {
    // Validación 1: Debe existir la cabecera guardada
    if (!this.codigoAsientoActual) {
      this.snackBar.open('⚠️ Debe guardar la cabecera primero', 'Cerrar', {
        duration: 4000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    // Validación 2: Deben existir al menos 2 detalles guardados
    const totalDetalles = this.cuentasDebeGrid.length + this.cuentasHaberGrid.length;
    if (totalDetalles < 2) {
      this.snackBar.open('⚠️ El asiento debe tener al menos 2 detalles guardados', 'Cerrar', {
        duration: 4000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    // Validación 3: El asiento debe estar cuadrado
    if (!this.asientoCuadrado) {
      this.snackBar.open('⚠️ El asiento debe estar cuadrado para confirmarlo (DEBE = HABER)', 'Cerrar', {
        duration: 4000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    // Mostrar diálogo de confirmación
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: '🔒 Confirmar Asiento',
        message: '¿Está seguro de confirmar este asiento?',
        detail: 'Una vez confirmado, NO se podrán realizar modificaciones. Solo podrá consultar, anular o reversar el asiento.',
        confirmText: 'Sí, Confirmar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.ejecutarConfirmacion();
      }
    });
  }

  /**
   * Ejecutar la confirmación del asiento (cambiar estado a ACTIVO)
   */
  private ejecutarConfirmacion(): void {
    this.loading = true;

    // Actualizar solo el estado del asiento a ACTIVO (1)
    const asientoActualizado = {
      ...this.asientoActual,
      codigo: this.codigoAsientoActual,
      estado: 1 // ACTIVO
    };

    this.asientoService.actualizarAsiento(this.codigoAsientoActual!, asientoActualizado).subscribe({
      next: () => {
        this.loading = false;
        this.form.patchValue({ estado: 1 });

        // Deshabilitar formulario para prevenir ediciones
        this.deshabilitarFormulario();

        this.snackBar.open('✅ Asiento confirmado exitosamente - Estado: ACTIVO 🔒', 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
      },
      error: (error: any) => {
        this.loading = false;
        const errorMsg = error?.error?.message || error?.message || 'Error desconocido';
        this.snackBar.open(`❌ Error al confirmar asiento: ${errorMsg}`, 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /**
   * Anular el asiento (cambiar estado a ANULADO)
   */
  anularAsiento(): void {
    if (!this.asientoActivo) {
      this.snackBar.open('⚠️ Solo se pueden anular asientos confirmados', 'Cerrar', {
        duration: 4000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: '🚫 Anular Asiento',
        message: '¿Está seguro de anular este asiento?',
        detail: 'Esta acción marcará el asiento como anulado.',
        confirmText: 'Sí, Anular',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.ejecutarAnulacion();
      }
    });
  }

  /**
   * Ejecutar la anulación del asiento
   */
  private ejecutarAnulacion(): void {
    this.loading = true;

    const asientoAnulado = {
      ...this.asientoActual,
      codigo: this.codigoAsientoActual,
      estado: 2 // ANULADO
    };

    this.asientoService.actualizarAsiento(this.codigoAsientoActual!, asientoAnulado).subscribe({
      next: () => {
        this.loading = false;
        this.form.patchValue({ estado: 2 });

        this.snackBar.open('✅ Asiento anulado exitosamente', 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
      },
      error: (error: any) => {
        this.loading = false;
        const errorMsg = error?.error?.message || error?.message || 'Error desconocido';
        this.snackBar.open(`❌ Error al anular asiento: ${errorMsg}`, 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /**
   * Reversar el asiento (servicio backend pendiente de especificar)
   */
  reversarAsiento(): void {
    if (!this.asientoActivo) {
      this.snackBar.open('⚠️ Solo se pueden reversar asientos confirmados', 'Cerrar', {
        duration: 4000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: '🔄 Reversar Asiento',
        message: '¿Está seguro de reversar este asiento?',
        detail: 'Esta acción creará un asiento inverso.',
        confirmText: 'Sí, Reversar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.ejecutarReversa();
      }
    });
  }

  /**
   * Ejecutar la reversa del asiento
   */
  private ejecutarReversa(): void {
    if (!this.codigoAsientoActual) {
      this.snackBar.open('❌ No hay asiento seleccionado para reversar', 'Cerrar', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.loading = true;

    this.asientoService.generaReversion(this.codigoAsientoActual).subscribe({
      next: (asientoReversado) => {
        this.loading = false;
        this.snackBar.open('✅ Asiento reversado exitosamente', 'Cerrar', {
          duration: 4000,
          panelClass: ['success-snackbar']
        });

        // Recargar el asiento actual para ver los cambios
        if (this.codigoAsientoActual) {
          this.cargarAsientoPorId(this.codigoAsientoActual);
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al reversar asiento:', error);
        this.snackBar.open('❌ Error al reversar el asiento', 'Cerrar', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /**
   * Imprimir el asiento usando reporte Jasper
   */
  imprimirAsiento(): void {
    if (!this.codigoAsientoActual) {
      this.snackBar.open('⚠️ No hay asiento para imprimir', 'Cerrar', {
        duration: 4000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    this.loading = true;

    // Parámetros del reporte RPRT_ASNT_CNTB
    const parametros = {
      P_PATH: '',  // Vacío por ahora, posteriormente tendrá el módulo
      P_REPORTE: 'ASIENTO',
      P_ASNTCDGO: this.codigoAsientoActual,
      P_IMAGEN: null  // Null por ahora, posteriormente path del logo
    };

    // Llamar al servicio Jasper con módulo 'cnt' y nombre del reporte
    this.jasperReportes.generar('cnt', 'RPRT_ASNT_CNTB', parametros, 'PDF').subscribe({
      next: (blob) => {
        this.loading = false;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `asiento-${this.codigoAsientoActual}.pdf`;
        a.click();

        setTimeout(() => URL.revokeObjectURL(url), 2000);

        this.snackBar.open('✅ Reporte generado exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('❌ No se pudo generar el reporte', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /**
   * Deshabilitar formulario cuando el asiento está confirmado
   */
  private deshabilitarFormulario(): void {
    // Deshabilitar campos de la cabecera (excepto los que ya están deshabilitados)
    this.form.get('tipo')?.disable();
    this.form.get('observaciones')?.disable();
    // fechaAsiento, fechaIngreso, numero, estado ya están deshabilitados o no editables
  }

  /**
   * Abre el diálogo de subdetalles de activo fijo para una línea del detalle.
   * Los subdetalles quedan en memoria y se persisten al presionar "Grabar Detalle".
   */
  abrirSubdetallesDialog(row: any): void {
    const item: CuentaItem = row.itemRef;
    if (!item) return;

    const dialogRef = this.dialog.open(SubdetalleAsientoDialogComponent, {
      width: '95vw',
      maxWidth: '95vw',
      height: '85vh',
      data: {
        cuentaInfo: `${item.cuenta?.cuentaContable ?? ''} — ${item.cuenta?.nombre ?? ''}`,
        codigoDetalle: item.codigoDetalle,
        subdetalles: item.subdetalles ?? [],
      },
    });

    dialogRef.afterClosed().subscribe((resultado: SubdetalleDialogResult | null) => {
      if (resultado !== null && resultado !== undefined) {
        // El diálogo calcula internamente los deletedCodes comparando contra lo que cargó desde BD
        item.subdetallesEliminados = [
          ...(item.subdetallesEliminados ?? []),
          ...resultado.deletedCodes,
        ];

        item.subdetalles = resultado.items;
        // Refrescar la tabla para actualizar el contador del badge
        this.calcularTotalesGrid();
        this.showMessage(
          `${resultado.items.length} subdetalle(s) configurado(s). Se guardarán al presionar "Grabar Detalle".`,
          'success'
        );
      }
    });
  }

  /**
   * Persiste los subdetalles de activo fijo asociados a un DetalleAsiento ya grabado.
   * Invoca onAllDone() cuando todos los registros han sido procesados (éxito o error).
   */
  private guardarSubdetalles(
    subdetalles: SubdetalleItem[],
    subdetallesAEliminar: number[],
    codigoDetalle: number,
    errores: string[],
    onAllDone: () => void
  ): void {
    const totalOps = subdetalles.length + subdetallesAEliminar.length;
    if (totalOps === 0) {
      onAllDone();
      return;
    }
    let subCompletados = 0;
    const verificarSub = () => {
      subCompletados++;
      if (subCompletados === totalOps) onAllDone();
    };

    // Eliminar subdetalles removidos del diálogo
    subdetallesAEliminar.forEach((codigo) => {
      this.subdetalleAsientoService.delete(codigo).subscribe({
        next: () => verificarSub(),
        error: (err: any) => {
          errores.push(`Error eliminando subdetalle ${codigo}: ${err?.message || 'Error'}`);
          verificarSub();
        },
      });
    });

    subdetalles.forEach((sub) => {
      const payload: any = {
        detalleAsiento: { codigo: codigoDetalle },
        codigoActivo: sub.codigoActivo || null,
        nombreBien: sub.nombreBien || null,
        categoria: sub.categoria || null,
        tipo: sub.tipo || null,
        fechaAdquisicion: sub.fechaAdquisicion || null,
        costoAdquisicion: sub.costoAdquisicion ?? null,
        mejorasCapitalizadas: sub.mejorasCapitalizadas ?? null,
        valorResidual: sub.valorResidual ?? null,
        baseDepreciar: sub.baseDepreciar ?? null,
        vidaUtilTotal: sub.vidaUtilTotal ?? null,
        vidaUtilRemanente: sub.vidaUtilRemanente ?? null,
        porcentajeDepreciacion: sub.porcentajeDepreciacion ?? null,
        cuotaDepreciacion: sub.cuotaDepreciacion ?? null,
        depreciacionAcumulada: sub.depreciacionAcumulada ?? null,
        valorNetoLibros: sub.valorNetoLibros ?? null,
        ubicacionGeneral: sub.ubicacionGeneral || null,
        ubicacionEspecifica: sub.ubicacionEspecifica || null,
        responsable: sub.responsable || null,
        estadoFisico: sub.estadoFisico || null,
        factura: sub.factura || null,
        observaciones: sub.observaciones || null,
      };

      if (sub._codigo) {
        payload.codigo = sub._codigo;
      }

      const operacion = sub._codigo
        ? this.subdetalleAsientoService.update(payload)
        : this.subdetalleAsientoService.add(payload);

      operacion.subscribe({
        next: () => verificarSub(),
        error: (err: any) => {
          errores.push(`Subdetalle "${sub.nombreBien ?? ''}": ${err?.message || 'Error'}`);
          verificarSub();
        },
      });
    });
  }

  /**
   * Volver a la pantalla de reporte listado asientos
   */
  volverAReporte(): void {
    this.router.navigate(['/menucontabilidad/reportes/listado-asientos']);
  }
}

