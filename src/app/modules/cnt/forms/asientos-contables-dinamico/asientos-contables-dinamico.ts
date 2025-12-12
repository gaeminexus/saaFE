import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { PlanCuenta } from '../../model/plan-cuenta';
import { TipoAsiento } from '../../model/tipo-asiento';
import { AsientoService } from '../../service/asiento.service';
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
    DragDropModule,
  ],
  templateUrl: './asientos-contables-dinamico.html',
  styleUrl: './asientos-contables-dinamico.scss',
})
export class AsientosContablesDinamico implements OnInit {
  form!: FormGroup;

  // Estado
  loading = false;
  codigoAsientoActual: number | null = null; // Para trackear si estamos editando

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

  // Empresa del usuario logueado
  private get idSucursal(): number {
    return parseInt(localStorage.getItem('idSucursal') || '280', 10);
  }

  constructor(
    private fb: FormBuilder,
    private detalleRubroService: DetalleRubroService,
    private tipoAsientoService: TipoAsientoService,
    private asientoService: AsientoService,
    private planCuentaService: PlanCuentaService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.cargarRubros();
    this.cargarCuentasPlan();
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

  private initializeForm(): void {
    this.form = this.fb.group({
      tipo: ['', [Validators.required]],
      numero: ['', [Validators.required]],
      fechaAsiento: [new Date(), [Validators.required]],
      fechaIngreso: [{ value: new Date(), disabled: true }],
      estado: [{ value: 'INCOMPLETO', disabled: true }],
      observaciones: ['', [Validators.maxLength(500)]],
      cuentasDebe: this.fb.array([this.createCuentaGroup()]),
      cuentasHaber: this.fb.array([this.createCuentaGroup()]),
    });
  }

  private createCuentaGroup(): FormGroup {
    return this.fb.group({
      cuenta: [null, [Validators.required]],
      valor: [0, [Validators.required, Validators.min(0.01)]],
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

    const asientoBackend: any = {
      empresa: {
        codigo: this.idSucursal,
      },
      tipoAsiento: {
        codigo: tipo?.value,
        nombre: tipoAsientoSeleccionado?.nombre || '',
      },
      numero: parseInt(numero?.value, 10),
      fechaAsiento: this.form.get('fechaAsiento')?.value,
      observaciones: this.form.get('observaciones')?.value || '',
      estado: 4, // INCOMPLETO
      nombreUsuario: localStorage.getItem('username') || 'sistema',
      fechaIngreso: new Date(),
      numeroMes: new Date().getMonth() + 1,
      numeroAnio: new Date().getFullYear(),
      moneda: 1,
      rubroModuloClienteP: 0,
      rubroModuloClienteH: 0,
      rubroModuloSistemaP: 0,
      rubroModuloSistemaH: 0,
      periodo: {
        codigo: 1,
      },
    };

    // Si estamos actualizando, incluir el código del asiento
    if (this.codigoAsientoActual) {
      asientoBackend.codigo = this.codigoAsientoActual;
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

  insertar(): void {
    console.log('🔍 Iniciando validación del asiento...');
    console.log('Form valid:', !this.form.invalid);
    console.log('Form value:', this.form.getRawValue());
    console.log('Diferencia:', this.diferencia);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.error('❌ Formulario inválido. Revisa los campos requeridos.');

      // Mostrar qué campos son inválidos
      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control?.invalid) {
          console.error(`Campo inválido: ${key}`, control.errors);
        }
      });

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

    if (this.diferencia !== 0) {
      this.snackBar.open(
        `El asiento no está balanceado. Debe: $${this.totalDebe.toFixed(
          2
        )} - Haber: $${this.totalHaber.toFixed(2)}`,
        'Cerrar',
        {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        }
      );
      return;
    }

    this.loading = true;

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
      periodo: {
        codigo: 1, // TODO: Obtener período actual activo
      },
    };

    console.log('📤 Enviando asiento al backend:', asientoBackend);

    this.asientoService.crearAsiento(asientoBackend).subscribe({
      next: (response) => {
        console.log('✅ Asiento creado exitosamente:', response);
        this.loading = false;
        this.snackBar.open(`✅ Asiento #${response.numero} creado exitosamente`, 'Cerrar', {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar'],
        });
        // Limpiar formulario después de éxito
        this.limpiar();
      },
      error: (error) => {
        console.error('❌ Error al crear asiento:', error);
        this.loading = false;
        const errorMsg = error?.error?.message || error?.message || 'Error desconocido al guardar';
        this.snackBar.open(`❌ Error al guardar asiento: ${errorMsg}`, 'Cerrar', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Formatea una fecha a formato LocalDate (YYYY-MM-DD) para el backend
   */
  private formatDateToLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  limpiar(): void {
    this.form.reset();
    this.cuentasDebe.clear();
    this.cuentasHaber.clear();
    this.cuentasDebe.push(this.createCuentaGroup());
    this.cuentasHaber.push(this.createCuentaGroup());
    this.calcularTotales();
    this.codigoAsientoActual = null; // Resetear código para nueva creación
    console.log('🧹 Formulario limpiado, listo para nuevo asiento');
  }
}
