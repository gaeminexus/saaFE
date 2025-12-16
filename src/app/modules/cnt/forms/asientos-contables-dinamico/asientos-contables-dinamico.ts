import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
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
import { MatDividerModule } from '@angular/material/divider';
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
import { ActivatedRoute } from '@angular/router';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { Asiento } from '../../model/asiento';
import { PlanCuenta } from '../../model/plan-cuenta';
import { TipoAsiento } from '../../model/tipo-asiento';
import { AsientoService } from '../../service/asiento.service';
import { DetalleAsientoService } from '../../service/detalle-asiento.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { TipoAsientoService } from '../../service/tipo-asiento.service';

interface CuentaItem {
  cuenta: PlanCuenta | null;
  valor: number;
  tipo: 'DEBE' | 'HABER';
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatChipsModule,
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

  // Arrays para el grid con drag-and-drop
  cuentasDebeGrid: CuentaItem[] = [];
  cuentasHaberGrid: CuentaItem[] = [];

  // Totales
  totalDebe = 0;
  totalHaber = 0;
  diferencia = 0;

  // Rubros para dropdowns
  tiposAsientos: any[] = [];
  cuentasPlan: PlanCuenta[] = [];

  // Constantes de rubros
  private readonly RUBRO_TIPO_ASIENTO = 15;

  // Columnas para mat-table
  displayedColumns: string[] = ['cuenta', 'valor', 'acciones'];

  // Grid de detalles del asiento
  detalleDataSource = new MatTableDataSource<any>([]);
  detalleColumns: string[] = ['cuenta', 'descripcion', 'debe', 'haber', 'tipo'];

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
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.cargarRubros();
    this.cargarCuentasPlan();
    this.verificarCargaAsiento();
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

  private cargarCuentasPlan(): void {
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
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar cuentas del plan:', err);
        this.cuentasPlan = [];
      },
    });
  }

  /**
   * Carga un asiento existente por ID con sus detalles
   */
  private cargarAsientoPorId(id: number, mode?: string): void {
    this.loading = true;
    console.log(`📥 Cargando asiento ID: ${id}...`);

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
          console.log('🗂️ Asiento cargado:', asiento);
          console.log('📅 Fecha Asiento raw:', asiento.fechaAsiento);
          console.log('📅 Fecha Ingreso raw:', asiento.fechaIngreso);

          this.codigoAsientoActual = asiento.codigo;
          this.asientoActual = asiento; // Almacenar datos completos

          // Procesar fechas con manejo de diferentes formatos
          const fechaAsiento = this.parseFechaFromBackend(asiento.fechaAsiento);
          const fechaIngreso = this.parseFechaFromBackend(asiento.fechaIngreso);

          console.log('📅 Fecha Asiento procesada:', fechaAsiento);
          console.log('📅 Fecha Ingreso procesada:', fechaIngreso);

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

          // Verificar que el setValue funcionó
          console.log('📝 Valores del formulario después de setValue y updateValueAndValidity:');
          console.log('  - fechaAsiento:', this.form.get('fechaAsiento')?.value);
          console.log('  - fechaIngreso:', this.form.get('fechaIngreso')?.value);
          console.log('  - numero:', this.form.get('numero')?.value);
          console.log('  - estado:', this.form.get('estado')?.value);

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
    console.log(`📋 Cargando detalles del asiento ID: ${asientoId}...`);

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
        console.log('🔍 Respuesta detalles del backend:', detalles);

        // Limpiar grids actuales siempre
        this.cuentasDebeGrid = [];
        this.cuentasHaberGrid = [];

        if (detalles && (Array.isArray(detalles) ? detalles.length > 0 : true)) {
          // Procesar cada detalle
          const detallesArray = Array.isArray(detalles) ? detalles : [detalles];

          let detallesProcesados = 0;
          detallesArray.forEach((detalle: any) => {
            const cuenta = this.cuentasPlan.find((c) => c.codigo === detalle.planCuenta?.codigo);

            if (cuenta) {
              const item: CuentaItem = {
                cuenta: cuenta,
                valor: 0,
                tipo: 'DEBE',
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
            }
          });

          console.log(`✅ ${detallesProcesados} detalles procesados en el grid dinámico`);
          if (detallesProcesados === 0) {
            this.showMessage('El asiento no tiene detalles válidos', 'info');
          }
        } else {
          console.log('ℹ️ No se encontraron detalles para este asiento');
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
  }

  private createCuentaGroup(): FormGroup {
    return this.fb.group({
      cuenta: [null], // No requerido - permite asientos incompletos
      valor: [0], // No requerido - permite asientos incompletos
    });
  }

  get cuentasDebe(): FormArray {
    return this.form.get('cuentasDebe') as FormArray;
  }

  get cuentasHaber(): FormArray {
    return this.form.get('cuentasHaber') as FormArray;
  }

  agregarCuentaDebe(): void {
    this.cuentasDebe.push(this.createCuentaGroup());
  }

  agregarCuentaHaber(): void {
    this.cuentasHaber.push(this.createCuentaGroup());
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
      id: `${tipo}-${Date.now()}-${Math.random()}`,
    };

    if (tipo === 'DEBE') {
      this.cuentasDebeGrid.push(nuevaCuenta);
    } else {
      this.cuentasHaberGrid.push(nuevaCuenta);
    }

    // Limpiar el formulario
    ultimoControl.patchValue({ cuenta: null, valor: 0 });

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
    const accion = this.codigoAsientoActual ? 'Actualizando' : 'Grabando';
    console.log(`💾 ${accion} cabecera del asiento...`);

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
        console.log('🗓️ Usando período del asiento existente:', this.asientoActual.periodo.codigo);
      }
    } else {
      // Para asientos nuevos, omitir el período y dejar que el backend use el valor por defecto
      console.log('🆕 Asiento nuevo - omitiendo período (backend usará valor por defecto)');
    }

    console.log(`📤 Enviando cabecera al backend (${accion}):`, asientoBackend);

    // Decidir si crear o actualizar
    const operacion = this.codigoAsientoActual
      ? this.asientoService.actualizarAsiento(this.codigoAsientoActual, asientoBackend)
      : this.asientoService.crearAsiento(asientoBackend);

    operacion.subscribe({
      next: (response) => {
        console.log(`✅ Cabecera de asiento ${accion.toLowerCase()} exitosamente:`, response);
        this.loading = false;

        // Guardar el código si es creación nueva
        if (!this.codigoAsientoActual && response.codigo) {
          this.codigoAsientoActual = response.codigo;
          console.log('🆔 Asiento creado con código:', this.codigoAsientoActual);
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
        console.error(`❌ Error al ${accion.toLowerCase()} cabecera:`, error);
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
    console.log('🔍 Iniciando grabado de detalle del asiento...');
    console.log('Form valid:', !this.form.invalid);
    console.log('Form value:', this.form.getRawValue());
    console.log('Diferencia:', this.diferencia);

    // Validar solo campos básicos (tipo, número, fecha) - permitir asientos incompletos
    const tipoValido = this.form.get('tipo')?.valid;
    const numeroValido = this.form.get('numero')?.valid;
    const fechaValida = this.form.get('fechaAsiento')?.valid;

    if (!tipoValido || !numeroValido || !fechaValida) {
      this.form.markAllAsTouched();
      console.error('❌ Campos básicos inválidos. Revisa tipo, número y fecha.');

      // Mostrar qué campos básicos son inválidos
      if (!tipoValido) console.error('Campo inválido: tipo');
      if (!numeroValido) console.error('Campo inválido: numero');
      if (!fechaValida) console.error('Campo inválido: fechaAsiento');

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
      console.log('📝 Asiento existente detectado. Grabando solo detalles...');
      this.grabarSoloDetalles();
    } else {
      console.log('📝 Asiento nuevo. Grabando cabecera + detalles...');
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

    console.log('📤 Enviando asiento completo al backend:', asientoBackend);

    this.asientoService.crearAsiento(asientoBackend).subscribe({
      next: (response) => {
        console.log('✅ Asiento creado exitosamente:', response);
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
    // Debug: Verificar dónde están los datos
    console.log('🔍 Debug - Verificando fuentes de datos:');
    console.log('   cuentasDebe.controls.length:', this.cuentasDebe.controls.length);
    console.log('   cuentasHaber.controls.length:', this.cuentasHaber.controls.length);
    console.log('   cuentasDebeGrid.length:', this.cuentasDebeGrid.length);
    console.log('   cuentasHaberGrid.length:', this.cuentasHaberGrid.length);
    console.log('   cuentasDebeGrid:', this.cuentasDebeGrid);
    console.log('   cuentasHaberGrid:', this.cuentasHaberGrid);

    // Recopilar detalles de debe y haber que tienen datos
    const detallesParaGrabar: any[] = [];

    // Procesar cuentas DEBE desde el GRID dinámico
    this.cuentasDebeGrid.forEach((item, index) => {
      if (item && item.cuenta && item.valor > 0) {
        detallesParaGrabar.push({
          asiento: {
            codigo: asientoId,
          },
          planCuenta: {
            codigo: item.cuenta.codigo,
          },
          valorDebe: item.valor,
          valorHaber: 0,
        });
      }
    });

    // Procesar cuentas HABER desde el GRID dinámico
    this.cuentasHaberGrid.forEach((item, index) => {
      if (item && item.cuenta && item.valor > 0) {
        detallesParaGrabar.push({
          asiento: {
            codigo: asientoId,
          },
          planCuenta: {
            codigo: item.cuenta.codigo,
          },
          valorDebe: 0,
          valorHaber: item.valor,
        });
      }
    });

    // FALLBACK: Si los grids están vacíos, intentar con FormArrays
    if (detallesParaGrabar.length === 0) {
      console.log('⚠️ Grids vacíos, intentando con FormArrays...');

      // Procesar cuentas DEBE desde FormArrays
      this.cuentasDebe.controls.forEach((control, index) => {
        const cuenta = control.get('cuenta')?.value;
        const valor = control.get('valor')?.value;

        if (cuenta && valor > 0) {
          detallesParaGrabar.push({
            asiento: {
              codigo: asientoId,
            },
            planCuenta: {
              codigo: cuenta.codigo,
            },
            valorDebe: valor,
            valorHaber: 0,
          });
        }
      });

      // Procesar cuentas HABER
      this.cuentasHaber.controls.forEach((control, index) => {
        const cuenta = control.get('cuenta')?.value;
        const valor = control.get('valor')?.value;

        if (cuenta && valor > 0) {
          detallesParaGrabar.push({
            asiento: {
              codigo: asientoId,
            },
            planCuenta: {
              codigo: cuenta.codigo,
            },
            valorDebe: 0,
            valorHaber: valor,
          });
        }
      });
    } // Fin del fallback

    // Log de los detalles que se van a grabar (versión simplificada)
    console.log('📋 Detalles del asiento a grabar (campos básicos):');
    console.log(`   Total de detalles: ${detallesParaGrabar.length}`);
    detallesParaGrabar.forEach((detalle, index) => {
      console.log(`   Detalle ${index + 1}:`, {
        asiento: detalle.asiento.codigo,
        planCuenta: detalle.planCuenta.codigo,
        valorDebe: detalle.valorDebe,
        valorHaber: detalle.valorHaber,
      });
    });
    console.log('📋 Fin detalles a grabar');

    if (detallesParaGrabar.length === 0) {
      console.log('ℹ️ No hay detalles para grabar');
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
    console.log('🧹 Formulario limpiado, listo para nuevo asiento');
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
      const parsedDate = new Date(fecha);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // Si es un número (timestamp)
    if (typeof fecha === 'number') {
      return new Date(fecha);
    }

    // Si es un array [año, mes, día, hora, minuto, segundo] (formato Java LocalDateTime)
    if (Array.isArray(fecha) && fecha.length >= 3) {
      // Nota: Los meses en JavaScript son 0-indexados, pero Java puede enviar 1-indexados
      const [year, month, day, hour = 0, minute = 0, second = 0] = fecha;
      return new Date(year, month - 1, day, hour, minute, second);
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
}
