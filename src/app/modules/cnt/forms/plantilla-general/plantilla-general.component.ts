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
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { DetallePlantilla, TipoMovimiento } from '../../model/detalle-plantilla-general';
import { EstadoPlantilla, Plantilla } from '../../model/plantilla-general';
import { DetallePlantillaService } from '../../service/detalle-plantilla.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { PlantillaService } from '../../service/plantilla-general.service';
import { ConfirmDeleteDetalleDialogComponent } from './confirm-delete-detalle-dialog.component';
import { DetallePlantillaDialogComponent } from './detalle-plantilla-dialog.component';

@Component({
  selector: 'app-plantilla-general',
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
    MatCheckboxModule,
    MatCardModule,
    MatDialogModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
  ],
  templateUrl: './plantilla-general.component.html',
  styleUrls: ['./plantilla-general.component.scss'],
})
export class PlantillaGeneralComponent implements OnInit {
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
  idSucursal = parseInt(localStorage.getItem('idSucursal') || '280', 10);

  // Enums
  EstadoPlantilla = EstadoPlantilla;
  TipoMovimiento = TipoMovimiento;

  @ViewChild('maestroPaginator') maestroPaginator!: MatPaginator;
  @ViewChild('detallesPaginator') detallesPaginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  // ViewChild para paginación y ordenamiento únicamente

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
    // Inicializar dataSource con array vacío
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
    // No se requiere lógica adicional tras la vista
  }

  /**
   * Crea el formulario reactivo para la plantilla
   */
  createForm(): FormGroup {
    return this.fb.group({
      codigo: [0],
      codigoAlterno: [''],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      estado: [EstadoPlantilla.ACTIVO, Validators.required],
      observacion: ['', Validators.maxLength(500)],
      fechaInactivo: [null],
      fechaCreacion: [null],
      fechaUpdate: [null],
      usuarioCreacion: [''],
      usuarioUpdate: [''],
    });
  }

  /**
   * Carga todas las plantillas
   */
  loadPlantillas(): void {
    console.log('🔄 [INICIO] loadPlantillas() llamado');
    console.log('🏢 idSucursal actual:', this.idSucursal);
    this.loading = true;
    this.plantillaService.getAll().subscribe({
      next: (data: Plantilla[] | null) => {
        console.log('📥 Plantillas recibidas del backend:', data?.length || 0);
        console.log('📥 Datos completos:', data);

        // Filtrar solo las plantillas de la empresa logueada y sistema: 0 (generales)
        this.plantillas = (data || []).filter(
          (p) => p.empresa && p.empresa.codigo === this.idSucursal && p.sistema === 0
        );

        console.log('✅ Plantillas después de filtrar por empresa:', this.plantillas.length);
        console.log('✅ Plantillas filtradas:', this.plantillas);

        this.loading = false;

        // Verificar si estamos usando datos mock
        if (this.plantillas.length > 0) {
          this.showMessage('Datos cargados correctamente', 'success');
        }
      },
      error: (error: any) => {
        console.error('Error al cargar plantillas:', error);

        // Mostrar mensaje más específico basado en el tipo de error
        if (error.status === 0 || error.message?.includes('ERR_CONNECTION_REFUSED')) {
          this.mostrarBannerDemo = true;
          this.showMessage(
            'Backend no disponible. Usando datos de ejemplo para demostración.',
            'info'
          );
        } else {
          this.showMessage(
            'Error al cargar plantillas. Verifique la conexión con el servidor.',
            'error'
          );
        }
        this.loading = false;
      },
    });
  }

  /**
   * Selecciona una plantilla del maestro
   */
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

    // Cargar detalles de la plantilla seleccionada
    this.cargarDetalles(plantilla.codigo);
  }
  /**
   * Carga plantilla completa con detalles
   */
  loadPlantillaCompleta(codigo: number): void {
    this.loading = true;
    this.plantillaService.getPlantillaCompleta(codigo).subscribe({
      next: (data: { plantilla: Plantilla; detalles: DetallePlantilla[] } | null) => {
        if (data) {
          // Cargar datos al formulario con mayúsculas
          this.plantillaForm.patchValue({
            ...data.plantilla,
            nombre: data.plantilla.nombre?.toUpperCase() || '',
            observacion: data.plantilla.observacion?.toUpperCase() || '',
          });

          // Cargar detalles en la tabla
          this.dataSourceDetalles.data = data.detalles.sort(
            (a: DetallePlantilla, b: DetallePlantilla) => a.codigo - b.codigo
          );

          // Se elimina el mensaje al seleccionar una plantilla para evitar notificaciones innecesarias
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error al cargar plantilla completa:', error);

        if (error.status === 0 || error.message?.includes('ERR_CONNECTION_REFUSED')) {
          this.showMessage(
            'Backend no disponible. Los detalles mostrados son datos de ejemplo.',
            'info'
          );
        } else {
          this.showMessage(
            'Error al cargar plantilla. Verifique la conexión con el servidor.',
            'error'
          );
        }
        this.loading = false;
      },
    });
  }

  /**
   * Inicia la creación de una nueva plantilla
   */
  nuevaPlantilla(): void {
    this.isNewRecord = true;
    this.isEditing = true;
    this.plantillaSeleccionada = null;
    this.plantillaForm.reset();
    this.plantillaForm.patchValue({
      codigo: 0,
      estado: EstadoPlantilla.ACTIVO,
      fechaCreacion: new Date(),
      usuarioCreacion: 'current-user',
    });
    this.dataSourceDetalles.data = [];
    this.showMessage('Listo para crear nueva plantilla', 'info');
  }
  /**
   * Carga los detalles de una plantilla desde el servidor
   */
  cargarDetalles(plantillaCodigo: number): void {
    this.detallePlantillaService.getByParent(plantillaCodigo).subscribe({
      next: (detalles: DetallePlantilla[] | null) => {
        this.dataSourceDetalles.data = (detalles || []).sort((a, b) => a.codigo - b.codigo);
      },
      error: () => {
        // Fallback a datos demo
        this.plantillaService.getDetallesByPlantillaCodigo(plantillaCodigo).subscribe({
          next: (detalles: DetallePlantilla[] | null) => {
            this.dataSourceDetalles.data = (detalles || []).sort((a, b) => a.codigo - b.codigo);
          },
          error: () => {
            this.dataSourceDetalles.data = [];
          },
        });
      },
    });
  }

  /**
   * Asegura que las columnas 'movimiento' y 'estado' estén presentes y visibles
   * y fuerza un re-render de la tabla si fuera necesario.
   */
  // Eliminado: lógica de refuerzo e instrumentación (ya no necesaria)

  /**
   * Instrumenta la tabla listando las clases de columnas reales presentes en el DOM
   * y añade estilos de refuerzo si faltan las columnas movimiento/estado.
   */
  // (Depurado) instrumentarTabla eliminado

  /** Inserta estilos forzados para mostrar las columnas ocultas */
  // (Depurado) inyectarEstilosRefuerzo eliminado

  /** Extiende los métodos de carga para ejecutar instrumentación */
  // (Depurado) postCargaDetallesHook eliminado

  /**
   * Verifica las MatColumnDef realmente registradas y si faltan 'movimiento' o 'estado'
   */
  // (Depurado) verificarColumnDefs eliminado

  /**
   * Intenta parchear dinámicamente agregando columnas faltantes mediante recreación manual
   */
  // (Depurado) parcheDinamicoColumnDefs eliminado

  /**
   * Guarda la plantilla (maestro y detalle)
   */
  guardarPlantilla(): void {
    console.log('🔵 [INICIO] guardarPlantilla() llamado');
    console.log('📋 Form valid:', this.plantillaForm.valid);
    console.log('📋 Form errors:', this.plantillaForm.errors);
    console.log('📋 Form value:', this.plantillaForm.value);

    if (this.plantillaForm.invalid) {
      console.warn('⚠️ Formulario inválido, deteniendo guardado');
      this.markFormGroupTouched();
      this.showMessage('Por favor complete todos los campos requeridos', 'warn');
      return;
    }

    const formValue = this.plantillaForm.value;

    // Validar fecha de desactivación si el estado es inactivo
    if (formValue.estado === EstadoPlantilla.INACTIVO && !formValue.fechaInactivo) {
      this.plantillaForm.patchValue({
        fechaInactivo: new Date(),
      });
      console.log('📅 Estado inactivo, agregando fechaInactivo');
    } else if (formValue.estado === EstadoPlantilla.ACTIVO) {
      this.plantillaForm.patchValue({
        fechaInactivo: null,
      });
      console.log('📅 Estado activo, removiendo fechaInactivo');
    }

    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    const empresaNombre = localStorage.getItem('empresaName') || 'Empresa';
    console.log('🏢 Empresa:', { codigo: empresaCodigo, nombre: empresaNombre });

    const plantillaData: Plantilla = {
      ...this.plantillaForm.value,
      nombre: this.plantillaForm.value.nombre?.toUpperCase() || '',
      observacion: this.plantillaForm.value.observacion?.toUpperCase() || '',
      fechaUpdate: new Date(),
      usuarioUpdate: 'current-user',
      empresa: { codigo: empresaCodigo, nombre: empresaNombre } as any,
      sistema: 0, // PLNSSSTM - Indicador de sistema (0 para plantilla general)
    };

    // Eliminar codigo si es nuevo registro (el backend lo genera)
    if (this.isNewRecord && (plantillaData as any).codigo === 0) {
      delete (plantillaData as any).codigo;
      console.log('🆕 Registro nuevo, código eliminado para que el backend lo genere');
    }

    if (this.isNewRecord) {
      plantillaData.fechaCreacion = new Date();
      plantillaData.usuarioCreacion = 'current-user';
    }

    console.log('📤 Datos a enviar:', plantillaData);
    console.log('🔄 Es nuevo registro:', this.isNewRecord);

    this.loading = true;

    if (this.isNewRecord) {
      console.log('➕ Llamando a plantillaService.add()...');
      this.plantillaService.add(plantillaData).subscribe({
        next: (result: Plantilla | null) => {
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
          } else {
            console.warn('⚠️ add() retornó null o undefined');
            this.showMessage('Error al crear la plantilla', 'error');
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.error('❌ Error al crear plantilla:', error);
          console.error('❌ Error status:', error.status);
          console.error('❌ Error message:', error.message);
          this.showMessage(
            'Error al guardar plantilla. Verifique la conexión con el servidor.',
            'error'
          );
          this.loading = false;
        },
      });
    } else {
      this.plantillaService.update(plantillaData).subscribe({
        next: (result: Plantilla | null) => {
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
          } else {
            this.showMessage('Error al actualizar la plantilla', 'error');
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error al actualizar plantilla:', error);
          this.showMessage(
            'Error al actualizar plantilla. Verifique la conexión con el servidor.',
            'error'
          );
          this.loading = false;
        },
      });
    }
  }

  /**
   * Cancela la edición actual
   */
  cancelarEdicion(): void {
    if (this.plantillaSeleccionada) {
      this.loadPlantillaCompleta(this.plantillaSeleccionada.codigo);
    } else {
      this.isEditing = false;
      this.isNewRecord = false;
      this.plantillaForm.reset();
      this.dataSourceDetalles.data = [];
    }
  }

  /**
   * Elimina una plantilla
   */
  eliminarPlantilla(): void {
    if (!this.plantillaSeleccionada) return;

    if (confirm(`¿Está seguro de eliminar la plantilla "${this.plantillaSeleccionada.nombre}"?`)) {
      this.plantillaService.delete(this.plantillaSeleccionada.codigo).subscribe({
        next: (success: boolean) => {
          if (success) {
            this.showMessage('Plantilla eliminada correctamente');
            this.loadPlantillas();
            this.isEditing = false;
            this.plantillaSeleccionada = null;
            this.plantillaForm.reset();
            this.dataSourceDetalles.data = [];
          }
        },
        error: (error: any) => {
          console.error('Error al eliminar plantilla:', error);
          this.showMessage('Error al eliminar plantilla');
        },
      });
    }
  }

  /**
   * Obtiene la clase CSS para el badge del estado
   */
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

  /**
   * Obtiene el texto del estado
   */
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

  /**
   * Extrae solo el nombre de la cuenta del string completo, eliminando el ID/código
   * Ejemplo: '8793 - CXC CORPORACION ELECTRICA DEL ECUADOR' -> 'CXC CORPORACION ELECTRICA DEL ECUADOR'
   * Ejemplo: '1110' -> '1110' (si no tiene guión, lo devuelve tal como está)
   */
  getPlanCuentaNombre(planCuentaString: string): string {
    if (!planCuentaString || typeof planCuentaString !== 'string') {
      return '';
    }

    // Limpiar espacios en blanco extras
    const texto = planCuentaString.trim();

    // Buscar el patrón: número seguido de ' - ' y luego el nombre
    const patron = /^\d+\s*-\s*(.+)$/;
    const coincidencia = texto.match(patron);

    if (coincidencia) {
      // Devolver solo la parte del nombre (después del guión)
      return coincidencia[1].trim();
    }

    // Si no coincide con el patrón esperado, buscar solo ' - '
    const partes = texto.split(' - ');
    if (partes.length > 1) {
      // Eliminar la primera parte (que debería ser el código) y unir el resto
      return partes.slice(1).join(' - ').trim();
    }

    // Si no tiene guión pero parece ser solo un número, devolver vacío o el mismo texto
    if (/^\d+$/.test(texto)) {
      return `Cuenta ${texto}`; // Dar un nombre más descriptivo si es solo número
    }

    // Devolver tal como está si no se puede procesar
    return texto;
  }

  /**
   * Aplica filtro a la lista de plantillas
   */
  applyFilterMaestro(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    // Implementar filtro personalizado para plantillas
    this.filterPlantillas(filterValue);
  }

  private filterPlantillas(filter: string): void {
    if (!filter) {
      // Mostrar todas las plantillas
      this.loadPlantillas();
    } else {
      const filteredPlantillas = this.plantillas.filter(
        (plantilla) =>
          plantilla.nombre.toLowerCase().includes(filter.toLowerCase()) ||
          plantilla.codigo.toString().toLowerCase().includes(filter.toLowerCase())
      );
      this.plantillas = filteredPlantillas;
    }
  }

  /**
   * Aplica filtro a los detalles
   */
  applyFilterDetalles(): void {
    this.dataSourceDetalles.filter = this.filterValue.trim().toLowerCase();
  }

  /**
   * Calcula el resumen de la plantilla
   */
  calcularResumen(): any {
    const detalles = this.dataSourceDetalles.data;
    const totalLineas = detalles.length;

    let totalDebe = 0;
    let totalHaber = 0;

    detalles.forEach((detalle) => {
      if (detalle.movimiento === TipoMovimiento.DEBE) {
        totalDebe += 1; // Solo contar líneas debe
      } else {
        totalHaber += 1; // Solo contar líneas haber
      }
    });

    return {
      totalLineas,
      totalDebe,
      totalHaber,
      diferencia: 0,
      balanceado: true,
    };
  }

  /**
   * Marca todos los campos del formulario como touched
   */
  private markFormGroupTouched(): void {
    Object.keys(this.plantillaForm.controls).forEach((key) => {
      this.plantillaForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Muestra mensaje al usuario usando snackbar
   */
  private showMessage(message: string, type: 'success' | 'error' | 'warn' | 'info' = 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: type === 'error' ? 7000 : 5000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
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

  // Métodos para gestión de detalles
  agregarDetalle(): void {
    if (!this.plantillaSeleccionada?.codigo) {
      this.showMessage('Debe guardar la plantilla antes de agregar detalles', 'warn');
      return;
    }

    // Cargar planes de cuenta reales del servidor y abrir diálogo
    this.cargarPlanesCuentaParaDialog();
  }
  private intentarGuardarDetalle(detalleOriginal: any, resultadoDialog: any): void {
    console.log('🚀 Intentando guardar detalle en servidor...');

    // Validaciones adicionales antes del envío
    if (!this.validarDetalleParaServidor(detalleOriginal)) {
      this.showMessage(
        '❌ Error de validación: Plan de cuenta no válido para el servidor',
        'error'
      );
      this.agregarDetalleLocal(resultadoDialog);
      return;
    }

    this.detallePlantillaService.add(detalleOriginal).subscribe({
      next: (detalleGuardado) => {
        if (detalleGuardado) {
          this.cargarDetalles(this.plantillaSeleccionada!.codigo);
          this.showMessage('✅ Detalle guardado correctamente en el servidor', 'success');
        } else {
          this.showMessage('⚠️ Respuesta vacía del servidor', 'warn');
          this.agregarDetalleLocal(resultadoDialog);
        }
      },
      error: (error) => {
        console.error('❌ Error al conectar con servidor. Detalles:', error);

        // Análisis específico del tipo de error
        const tipoError = this.analizarTipoError(error);

        switch (tipoError) {
          case 'INTEGRIDAD_FK':
            console.error(
              '🔍 Error de integridad detectado: FK_DTPL_PLNN - Plan de cuenta no existe en servidor'
            );
            console.error(
              `🔍 Código problemático: PLNNCDGO = ${detalleOriginal.planCuenta?.codigo}`
            );
            console.error(
              `🔍 Verificar en servidor: SELECT * FROM CNT.PLNN WHERE CODIGO = ${detalleOriginal.planCuenta?.codigo}`
            );
            this.showMessage(
              `🔍 Error FK_DTPL_PLNN: El plan de cuenta [${detalleOriginal.planCuenta?.codigo}] "${resultadoDialog.planCuenta?.cuentaContable}" no existe en el servidor. Guardado localmente.`,
              'warn'
            );
            break;

          case 'SERVIDOR_NO_DISPONIBLE':
            console.error('📡 Servidor no disponible');
            this.showMessage(
              `📡 Servidor no disponible. Detalle guardado localmente para demostración.`,
              'info'
            );
            break;

          case 'ERROR_TRANSACCION':
            console.error('⚡ Error de transacción en servidor');
            this.showMessage(
              `⚡ Error de transacción en el servidor. Guardado localmente para demostración.`,
              'warn'
            );
            break;

          default:
            console.error('💾 Error general, guardando en modo demostración...');
            this.showMessage(
              `🔄 Error del servidor. Detalle guardado localmente para demostración.`,
              'info'
            );
        }

        this.agregarDetalleLocal(resultadoDialog);
      },
    });
  }

  /**
   * Valida que el detalle tenga los datos mínimos requeridos por el servidor
   */
  private validarDetalleParaServidor(detalle: any): boolean {
    // Validar que el plan de cuenta exista y tenga código válido
    if (!detalle.planCuenta || !detalle.planCuenta.codigo || detalle.planCuenta.codigo <= 0) {
      console.error('❌ Plan de cuenta inválido:', detalle.planCuenta);
      return false;
    }

    // Validar que el movimiento sea válido (1=DEBE, 2=HABER)
    if (!detalle.movimiento || (detalle.movimiento !== 1 && detalle.movimiento !== 2)) {
      console.error('❌ Tipo de movimiento inválido:', detalle.movimiento);
      return false;
    }

    // Validar que la plantilla padre exista
    if (!detalle.plantilla || !detalle.plantilla.codigo || detalle.plantilla.codigo <= 0) {
      console.error('❌ Plantilla padre inválida:', detalle.plantilla);
      return false;
    }

    return true;
  }

  /**
   * Detecta si el error es de integridad referencial específicamente FK_DTPL_PLNN
   */
  private esErrorIntegridad(error: any): boolean {
    const errorMsg = error?.error || error?.message || '';
    return (
      errorMsg.includes('FK_DTPL_PLNN') ||
      errorMsg.includes('ORA-02291') ||
      errorMsg.includes('restricción de integridad') ||
      errorMsg.includes('clave principal no encontrada')
    );
  }

  /**
   * Analiza el tipo de error del servidor para dar retroalimentación específica
   */
  private analizarTipoError(
    error: any
  ): 'INTEGRIDAD_FK' | 'SERVIDOR_NO_DISPONIBLE' | 'ERROR_TRANSACCION' | 'OTRO' {
    if (!error) return 'OTRO';

    const status = error.status;
    const errorMsg = (error?.error || error?.message || '').toLowerCase();

    // Error de integridad FK_DTPL_PLNN (plan de cuenta no existe)
    if (this.esErrorIntegridad(error)) {
      return 'INTEGRIDAD_FK';
    }

    // Servidor no disponible
    if (status === 0 || status === 503 || errorMsg.includes('connection refused')) {
      return 'SERVIDOR_NO_DISPONIBLE';
    }

    // Error de transacción (Jakarta/JTA)
    if (
      status === 500 &&
      (errorMsg.includes('rollbackexception') ||
        errorMsg.includes('transaction') ||
        errorMsg.includes('jakarta') ||
        errorMsg.includes('arjuna'))
    ) {
      return 'ERROR_TRANSACCION';
    }

    return 'OTRO';
  }

  /**
   * Prepara y valida un detalle para envío al servidor
   */
  private prepararDetalleParaServidor(resultadoDialog: any): any | null {
    // Validaciones básicas del resultado del diálogo
    if (!resultadoDialog.planCuenta || !resultadoDialog.planCuenta.codigo) {
      this.showMessage('❌ Error: Debe seleccionar un plan de cuenta válido', 'error');
      return null;
    }

    if (
      !resultadoDialog.movimiento ||
      (resultadoDialog.movimiento !== 1 && resultadoDialog.movimiento !== 2)
    ) {
      this.showMessage('❌ Error: Tipo de movimiento inválido', 'error');
      return null;
    }

    // Validar que tengamos una plantilla seleccionada
    if (!this.plantillaSeleccionada?.codigo) {
      this.showMessage('❌ Error: No hay plantilla seleccionada válida', 'error');
      return null;
    }

    // Construir objeto optimizado para el servidor
    const detalle = {
      plantilla: {
        codigo: this.plantillaSeleccionada.codigo,
      },
      planCuenta: {
        codigo: resultadoDialog.planCuenta.codigo,
      },
      descripcion: resultadoDialog.descripcion || '',
      movimiento: resultadoDialog.movimiento,
      estado: resultadoDialog.estado || 1,
      // Formatear fechas para LocalDateTime (sin timezone)
      fechaDesde: this.funcionesDatosService.formatearFechaParaBackend(resultadoDialog.fechaDesde),
      fechaHasta: this.funcionesDatosService.formatearFechaParaBackend(resultadoDialog.fechaHasta),
      fechaInactivo:
        resultadoDialog.estado === 2
          ? this.funcionesDatosService.formatearFechaParaBackend(new Date())
          : null,
      // Campos auxiliares requeridos por el backend
      auxiliar1: 0,
      auxiliar2: 0,
      auxiliar3: 0,
      auxiliar4: 0,
      auxiliar5: 0,
    };

    // Log detallado para debugging
    console.log('📋 Plan de cuenta seleccionado:', {
      codigo: resultadoDialog.planCuenta.codigo,
      cuentaContable: resultadoDialog.planCuenta.cuentaContable,
      nombre: resultadoDialog.planCuenta.nombre,
      tipo: resultadoDialog.planCuenta.tipo,
      nivel: resultadoDialog.planCuenta.nivel,
    });

    return detalle;
  }

  private agregarDetalleLocal(resultadoDialog: any): void {
    const detalleLocal: DetallePlantilla = {
      codigo: Date.now(), // ID temporal
      plantilla: this.plantillaSeleccionada!,
      planCuenta: resultadoDialog.planCuenta,
      descripcion: resultadoDialog.descripcion,
      movimiento: resultadoDialog.movimiento,
      fechaDesde: resultadoDialog.fechaDesde,
      fechaHasta: resultadoDialog.fechaHasta,
      auxiliar1: 0,
      auxiliar2: 0,
      auxiliar3: 0,
      auxiliar4: 0,
      auxiliar5: 0,
      estado: resultadoDialog.estado || 1,
      fechaInactivo: resultadoDialog.estado === 2 ? new Date() : undefined!,
    };

    const data = [...this.dataSourceDetalles.data, detalleLocal];
    this.dataSourceDetalles.data = data;

    // Log informativo para demostración
    console.log('💾 Detalle agregado localmente:', {
      planCuenta: `${resultadoDialog.planCuenta.codigo} - ${resultadoDialog.planCuenta.nombre}`,
      descripcion: resultadoDialog.descripcion,
      movimiento: resultadoDialog.movimiento === 1 ? 'DEBE' : 'HABER',
      totalDetalles: data.length,
    });

    // Mostrar mensaje de confirmación específico
    const movimientoTexto = resultadoDialog.movimiento === 1 ? 'DEBE' : 'HABER';
    this.showMessage(
      `✅ Detalle agregado (${movimientoTexto}): ${resultadoDialog.planCuenta.nombre}`,
      'success'
    );
  }

  editarDetalle(detalle: DetallePlantilla): void {
    // Cargar planes de cuenta reales del servidor y abrir diálogo para editar
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
        this.showMessage('Detalle eliminado (no persistido aún)', 'info');
        return;
      }

      this.detallePlantillaService.delete(detalle.codigo).subscribe({
        next: () => this.showMessage('Detalle eliminado', 'success'),
        error: () => {
          this.dataSourceDetalles.data = original; // rollback
          this.showMessage('Error al eliminar. Se revierte el cambio.', 'error');
        },
      });
    });
  }

  duplicarDetalle(detalle: DetallePlantilla): void {
    const nuevoDetalle: DetallePlantilla = {
      ...detalle,
      codigo: Date.now(), // Código temporal
      descripcion: `${detalle.descripcion} (Copia)`,
    };

    const detalles = [...this.dataSourceDetalles.data, nuevoDetalle];
    this.dataSourceDetalles.data = detalles;
    this.showMessage('Detalle duplicado', 'info');
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

  /**
   * Cierra el banner de demostración
   */
  cerrarBanner(): void {
    this.mostrarBannerDemo = false;
  }

  /**
   * Función temporal para debugging - verificar datos de detalles
   */
  debugDetalles(): void {
    console.log('🔍 DEBUG DETALLES COMPLETO:');
    console.log('📋 Total detalles:', this.dataSourceDetalles.data.length);
    console.log('📊 Columnas definidas:', this.displayedColumnsDetalles);
    console.log('🎯 Plantilla seleccionada:', this.plantillaSeleccionada?.codigo);

    // Verificar si hay datos
    if (this.dataSourceDetalles.data.length === 0) {
      console.warn('⚠️ NO HAY DATOS en dataSourceDetalles');
      return;
    }

    this.dataSourceDetalles.data.forEach((detalle, index) => {
      console.log(`📄 Detalle ${index}:`, {
        codigo: detalle.codigo,
        descripcion: detalle.descripcion,
        movimiento: {
          valor: detalle.movimiento,
          tipo: typeof detalle.movimiento,
          esValido: detalle.movimiento === 1 || detalle.movimiento === 2,
        },
        estado: {
          valor: detalle.estado,
          tipo: typeof detalle.estado,
          esValido: detalle.estado === 1 || detalle.estado === 0,
        },
        planCuenta: detalle.planCuenta
          ? typeof detalle.planCuenta === 'string'
            ? detalle.planCuenta
            : `${detalle.planCuenta.codigo} - ${detalle.planCuenta.nombre}`
          : 'Sin plan de cuenta',
      });
    });

    // Verificar el estado del MatTableDataSource
    console.log('🗂️ Estado del DataSource:', {
      data: this.dataSourceDetalles.data,
      filteredData: this.dataSourceDetalles.filteredData,
      filter: this.dataSourceDetalles.filter,
      paginator: !!this.dataSourceDetalles.paginator,
      sort: !!this.dataSourceDetalles.sort,
    });
  }

  /**
   * Diagnóstico completo del problema de columnas invisibles
   */
  diagnosticoCompletoColumnas(): void {
    console.log('🩺 === DIAGNÓSTICO COMPLETO DE COLUMNAS ===');

    // 1. Verificar definición básica
    console.log('1️⃣ DEFINICIONES BÁSICAS:');
    console.log('📊 displayedColumnsDetalles:', this.displayedColumnsDetalles);
    console.log('🗃️ dataSourceDetalles existe:', !!this.dataSourceDetalles);
    console.log('📋 Cantidad de datos:', this.dataSourceDetalles?.data?.length || 0);

    // 2. Verificar datos específicos
    if (this.dataSourceDetalles?.data?.length > 0) {
      const primerDetalle = this.dataSourceDetalles.data[0];
      console.log('2️⃣ DATOS DEL PRIMER DETALLE:');
      console.log('  movimiento:', primerDetalle.movimiento, typeof primerDetalle.movimiento);
      console.log('  estado:', primerDetalle.estado, typeof primerDetalle.estado);
      console.log('  Detalle completo:', primerDetalle);
    }

    // 3. Verificar DOM
    console.log('3️⃣ VERIFICACIÓN DOM:');
    setTimeout(() => {
      const table = document.querySelector('table[mat-table]');
      const tableContainer = document.querySelector('.table-container');

      console.log('🏗️ Contenedor tabla existe:', !!tableContainer);
      console.log('🏗️ Elemento table existe:', !!table);

      if (table) {
        const allHeaders = table.querySelectorAll('th');
        const allCells = table.querySelectorAll('td');

        console.log('📋 Total headers:', allHeaders.length);
        console.log('📋 Total celdas:', allCells.length);

        // Listar todos los headers
        Array.from(allHeaders).forEach((header, index) => {
          console.log(
            `  Header ${index}: "${header.textContent?.trim()}" - clases: ${header.className}`
          );
        });

        // Buscar específicamente movimiento y estado
        const movimientoHeader = Array.from(allHeaders).find(
          (h) => h.textContent?.includes('Movimiento') || h.classList.contains('movimiento-header')
        );
        const estadoHeader = Array.from(allHeaders).find(
          (h) => h.textContent?.includes('Estado') || h.classList.contains('estado-header')
        );

        console.log('🎯 Header Movimiento encontrado:', !!movimientoHeader);
        console.log('🎯 Header Estado encontrado:', !!estadoHeader);

        if (!movimientoHeader || !estadoHeader) {
          console.error('❌ PROBLEMA: Headers de movimiento o estado no encontrados');

          // Verificar si las ng-container existen
          const movimientoContainer = document.querySelector(
            'ng-container[matColumnDef="movimiento"]'
          );
          const estadoContainer = document.querySelector('ng-container[matColumnDef="estado"]');

          console.log('📦 ng-container movimiento:', !!movimientoContainer);
          console.log('📦 ng-container estado:', !!estadoContainer);
        }
      }
    }, 200);

    // 4. Verificar *ngIf de la tabla
    const tablaDeberiaMostrarse =
      this.displayedColumnsDetalles && this.displayedColumnsDetalles.length > 0;
    console.log('4️⃣ CONDICIONES DE VISIBILIDAD:');
    console.log('👁️ Tabla debería mostrarse (*ngIf):', tablaDeberiaMostrarse);

    this.showMessage('🩺 Diagnóstico ejecutado. Revisar consola.', 'info');
  }

  /**
   * Método para verificar y solucionar problemas de renderizado de columnas
   */
  verificarYSolucionarRenderizado(): void {
    console.log('🔧 VERIFICANDO RENDERIZADO DE COLUMNAS:');

    // 0. Verificar condiciones básicas de la tabla
    this.verificarCondicionesTabla();

    // 1. Verificar filtros activos
    console.log('🔍 Filtro activo:', this.dataSourceDetalles.filter);
    if (this.dataSourceDetalles.filter) {
      console.log('⚠️ Hay filtro activo, limpiando...');
      this.dataSourceDetalles.filter = '';
      this.filterValue = '';
    }

    // 2. Verificar datos filtrados vs datos originales
    console.log('📊 Datos originales:', this.dataSourceDetalles.data.length);
    console.log('📊 Datos filtrados:', this.dataSourceDetalles.filteredData.length);

    // 3. Forzar re-renderizado de la tabla
    console.log('🔄 Forzando actualización de tabla...');
    const currentData = [...this.dataSourceDetalles.data];
    this.dataSourceDetalles.data = [];

    setTimeout(() => {
      this.dataSourceDetalles.data = currentData;
      console.log('✅ Tabla actualizada con', currentData.length, 'registros');

      // 4. Verificar columnas renderizadas
      setTimeout(() => {
        // Buscar la tabla usando diferentes selectores
        let tableElement =
          document.querySelector('table[mat-table]') ||
          document.querySelector('mat-table') ||
          document.querySelector('.mat-table');

        console.log('🔍 Buscando elemento tabla...');

        if (tableElement) {
          console.log('✅ Tabla encontrada:', tableElement.tagName);

          const headers = tableElement.querySelectorAll('th');
          const rows = tableElement.querySelectorAll('td');
          console.log('🏗️ Headers encontrados:', headers.length);
          console.log('🏗️ Celdas encontradas:', rows.length);

          // Log de todos los headers para debugging
          Array.from(headers).forEach((header, index) => {
            console.log(`📋 Header ${index}: "${header.textContent?.trim()}"`);
          });

          // Buscar específicamente las columnas de movimiento y estado
          const movimientoHeaders = Array.from(headers).filter(
            (h) =>
              h.textContent?.includes('Movimiento') || h.classList.contains('movimiento-header')
          );
          const estadoHeaders = Array.from(headers).filter(
            (h) => h.textContent?.includes('Estado') || h.classList.contains('estado-header')
          );

          console.log('🎯 Headers Movimiento encontrados:', movimientoHeaders.length);
          console.log('🎯 Headers Estado encontrados:', estadoHeaders.length);

          if (movimientoHeaders.length === 0) {
            console.error('❌ PROBLEMA: No se encuentra el header de Movimiento');
          } else {
            console.log('✅ Header Movimiento encontrado:', movimientoHeaders[0].textContent);
          }

          if (estadoHeaders.length === 0) {
            console.error('❌ PROBLEMA: No se encuentra el header de Estado');
          } else {
            console.log('✅ Header Estado encontrado:', estadoHeaders[0].textContent);
          }

          // Verificar si las columnas tienen datos
          const movimientoCells = tableElement.querySelectorAll(
            '.movimiento-cell, td.mat-column-movimiento'
          );
          const estadoCells = tableElement.querySelectorAll('.estado-cell, td.mat-column-estado');

          console.log('🔢 Celdas Movimiento:', movimientoCells.length);
          console.log('🔢 Celdas Estado:', estadoCells.length);
        } else {
          console.error('❌ PROBLEMA: No se encuentra ningún elemento de tabla');

          // Debugging adicional - buscar todos los elementos mat-table posibles
          const allTables = document.querySelectorAll('table');
          console.log('🔍 Total de tablas en el DOM:', allTables.length);

          allTables.forEach((table, index) => {
            console.log(`📋 Tabla ${index}:`, table.className, table.getAttribute('mat-table'));
          });
        }
      }, 200);
    }, 100);
  }

  /**
   * Prueba el método getPlanCuentaNombre con diferentes casos
   */
  probarExtraccionNombre(): void {
    const casos = [
      '8793 - CXC CORPORACION ELECTRICA DEL ECUADOR',
      '1110 - CAJA GENERAL',
      '2110 - PROVEEDORES NACIONALES',
      '1110',
      'Solo texto sin guión',
      '123-456 - CUENTA CON GUIÓN DIFERENTE',
    ];

    console.log('🧪 PRUEBAS DE EXTRACCIÓN DE NOMBRES:');
    console.log('=====================================');

    casos.forEach((caso, index) => {
      const resultado = this.getPlanCuentaNombre(caso);
      console.log(`${index + 1}. Entrada: "${caso}"`);
      console.log(`   Resultado: "${resultado}"`);
      console.log('');
    });

    this.showMessage('🧪 Pruebas ejecutadas. Ver consola para resultados.', 'info');
  }

  /**
   * Verificar específicamente las condiciones del *ngIf de la tabla
   */
  verificarCondicionesTabla(): void {
    console.log('🔍 VERIFICANDO CONDICIONES DE VISIBILIDAD DE LA TABLA:');
    console.log('📊 displayedColumnsDetalles existe:', !!this.displayedColumnsDetalles);
    console.log('📊 displayedColumnsDetalles.length:', this.displayedColumnsDetalles?.length);
    console.log(
      '📊 Condición *ngIf cumplida:',
      !!(this.displayedColumnsDetalles && this.displayedColumnsDetalles.length > 0)
    );

    console.log('🗃️ dataSourceDetalles existe:', !!this.dataSourceDetalles);
    console.log('🗃️ dataSourceDetalles.data existe:', !!this.dataSourceDetalles?.data);
    console.log('🗃️ dataSourceDetalles.data.length:', this.dataSourceDetalles?.data?.length);

    // Verificar si la tabla debería estar visible
    const deberiaEstarVisible =
      this.displayedColumnsDetalles && this.displayedColumnsDetalles.length > 0;
    console.log('👁️ La tabla DEBERÍA estar visible:', deberiaEstarVisible);

    if (!deberiaEstarVisible) {
      console.error('❌ PROBLEMA ENCONTRADO: La condición *ngIf NO se cumple');
      console.log('🔧 Intentando corregir displayedColumnsDetalles...');

      this.displayedColumnsDetalles = [
        'codigoCuenta',
        'descripcion',
        'movimiento',
        'estado',
        'acciones',
      ];

      console.log('✅ displayedColumnsDetalles corregido:', this.displayedColumnsDetalles);
      this.showMessage('🔧 Condiciones de tabla corregidas', 'info');
    } else {
      console.log('✅ Las condiciones están correctas, la tabla debería ser visible');

      // Verificar en el DOM si realmente está visible
      setTimeout(() => {
        const tableContainer = document.querySelector('.table-container');
        const table = document.querySelector('table[mat-table]');

        console.log('🏗️ Contenedor de tabla encontrado:', !!tableContainer);
        console.log('🏗️ Elemento tabla encontrado:', !!table);

        if (tableContainer && !table) {
          console.error('❌ PROBLEMA: Contenedor existe pero tabla no se renderiza');
        }
      }, 100);
    }
  }

  /**
   * Método de emergencia para forzar la visibilidad de las columnas
   */
  forzarVisibilidadColumnas(): void {
    console.log('🚨 MÉTODO DE EMERGENCIA: Forzando visibilidad de columnas');

    // 1. Limpiar y reconfigurar displayedColumns
    this.displayedColumnsDetalles = [];

    setTimeout(() => {
      this.displayedColumnsDetalles = [
        'codigoCuenta',
        'descripcion',
        'movimiento',
        'estado',
        'acciones',
      ];
      console.log('🔧 Columnas reconfiguradas:', this.displayedColumnsDetalles);

      // 2. Forzar CSS para hacer visibles las columnas
      setTimeout(() => {
        const style = document.createElement('style');
        style.innerHTML = `
          .movimiento-header, .movimiento-cell,
          .estado-header, .estado-cell {
            display: table-cell !important;
            visibility: visible !important;
            width: auto !important;
            min-width: 120px !important;
          }
          .mat-column-movimiento, .mat-column-estado {
            display: table-cell !important;
            visibility: visible !important;
          }
        `;
        document.head.appendChild(style);
        console.log('💅 CSS de emergencia aplicado');

        this.showMessage(
          '🚨 CSS de emergencia aplicado. Las columnas deberían ser visibles ahora.',
          'warn'
        );
      }, 100);
    }, 50);
  }

  /**
   * Método temporal para agregar datos de prueba
   */
  agregarDatosPrueba(): void {
    const datosPrueba: DetallePlantilla[] = [
      {
        codigo: 1,
        descripcion: 'Detalle de prueba 1',
        movimiento: 1, // DEBE
        estado: 1, // Activo
        plantilla: this.plantillaSeleccionada!,
        planCuenta: {
          codigo: '1110',
          nombre: 'Cuenta de Prueba 1',
          estado: 1,
        } as any,
        fechaDesde: new Date(),
        fechaHasta: new Date(),
        auxiliar1: 0,
        auxiliar2: 0,
        auxiliar3: 0,
        auxiliar4: 0,
        auxiliar5: 0,
        fechaInactivo: new Date(),
      },
      {
        codigo: 2,
        descripcion: 'Detalle de prueba 2',
        movimiento: 2, // HABER
        estado: 0, // Inactivo
        plantilla: this.plantillaSeleccionada!,
        planCuenta: {
          codigo: '2110',
          nombre: 'Cuenta de Prueba 2',
          estado: 1,
        } as any,
        fechaDesde: new Date(),
        fechaHasta: new Date(),
        auxiliar1: 0,
        auxiliar2: 0,
        auxiliar3: 0,
        auxiliar4: 0,
        auxiliar5: 0,
        fechaInactivo: new Date(),
      },
    ];

    console.log('🧪 ANTES de agregar datos de prueba:');
    console.log('📊 Columnas configuradas:', this.displayedColumnsDetalles);
    console.log('📋 Datos anteriores:', this.dataSourceDetalles.data.length);

    this.dataSourceDetalles.data = datosPrueba;

    console.log('✅ DESPUÉS de agregar datos de prueba:');
    console.log('📋 Nuevos datos:', this.dataSourceDetalles.data.length);
    console.log('🔍 Primer detalle:', this.dataSourceDetalles.data[0]);
    console.log('💾 DataSource completo:', this.dataSourceDetalles);

    // Forzar detección de cambios
    setTimeout(() => {
      this.debugDetalles();
    }, 100);
  }
  /**
   * Carga planes de cuenta reales del servidor para el diálogo
   * Optimizado para usar directamente getAll() que sabemos que funciona
   */
  private cargarPlanesCuentaParaDialog(detalleExistente?: DetallePlantilla): void {
    console.log('🔍 Cargando planes de cuenta reales del servidor (método optimizado)...');
    this.loading = true;

    // Usar directamente getAll() ya que sabemos que funciona
    this.planCuentaService.getAll().subscribe({
      next: (planCuentas) => {
        this.loading = false;
        const planes = Array.isArray(planCuentas) ? planCuentas : [];

        if (planes.length === 0) {
          console.warn('⚠️ No se encontraron planes de cuenta en el servidor');
          this.showMessage('No hay planes de cuenta disponibles', 'warn');
        } else {
          console.log(`✅ Se cargaron ${planes.length} planes de cuenta del servidor`);
          // Filtrar solo los planes de la empresa dinámica
          const planesFiltrados = planes.filter(
            (plan) => plan.empresa && plan.empresa.codigo === this.idSucursal
          );
          console.log(
            `🔍 Planes filtrados para empresa ${this.idSucursal}: ${planesFiltrados.length}`
          );

          // Ordenar jerárquicamente como en plan-grid
          const planesOrdenados = this.ordenarPlanesCuentaJerarquicamente(planesFiltrados);
          console.log(`📋 Planes ordenados jerárquicamente: ${planesOrdenados.length}`);

          this.abrirDialogoConPlanes(planesOrdenados, detalleExistente);
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error al cargar planes del servidor:', error);
        this.showMessage('Error al cargar planes de cuenta. Verifique la conexión.', 'error');
      },
    });
  }
  /**
   * Método de fallback para cargar planes de cuenta usando getAll
   */
  private cargarPlanesCuentaFallback(detalleExistente?: DetallePlantilla): void {
    this.planCuentaService.getAll().subscribe({
      next: (planCuentas) => {
        this.loading = false;
        const planes = Array.isArray(planCuentas) ? planCuentas : [];

        if (planes.length === 0) {
          console.warn('⚠️ No se encontraron planes de cuenta en el servidor');
          this.showMessage('No hay planes de cuenta disponibles', 'warn');
        } else {
          console.log(
            `✅ Fallback exitoso: Se cargaron ${planes.length} planes de cuenta del servidor`
          );
          // Filtrar solo los planes de la empresa logueada en fallback también
          const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
          const planesFiltrados = planes.filter(
            (plan) => plan.empresa && plan.empresa.codigo === empresaCodigo
          );
          console.log(
            `🔍 Planes filtrados para empresa ${empresaCodigo} (fallback): ${planesFiltrados.length}`
          );
          this.abrirDialogoConPlanes(planesFiltrados, detalleExistente);
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('❌ Error total al cargar planes:', error);
        this.showMessage('Error al cargar planes de cuenta. Verifique la conexión.', 'error');
      },
    });
  }

  /**
   * Abre el diálogo con los planes de cuenta cargados
   */
  private abrirDialogoConPlanes(planCuentas: any[], detalleExistente?: DetallePlantilla): void {
    const dialogRef = this.dialog.open(DetallePlantillaDialogComponent, {
      width: '720px',
      data: { planCuentas, detalle: detalleExistente },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        if (detalleExistente) {
          // Lógica de edición
          this.procesarEdicionDetalle(detalleExistente, result);
        } else {
          // Lógica de creación
          this.procesarNuevoDetalle(result);
        }
      }
    });
  }

  /**
   * Procesa la creación de un nuevo detalle
   */
  private procesarNuevoDetalle(result: any): void {
    // Preparar detalle con validaciones mejoradas
    const nuevoDetalle = this.prepararDetalleParaServidor(result);
    if (!nuevoDetalle) {
      return; // Error ya mostrado en prepararDetalleParaServidor
    }

    console.log('📤 Enviando detalle validado al servidor:', JSON.stringify(nuevoDetalle, null, 2));

    // Logging específico para el problema FK_DTPL_PLNN
    console.log('🔍 ANÁLISIS DE DATOS PARA FK_DTPL_PLNN:');
    console.log(`   - PLNSCDGO (Plan Sistema): ${nuevoDetalle.plantilla.codigo}`);
    console.log(`   - PLNNCDGO (Plan Cuenta): ${nuevoDetalle.planCuenta.codigo}`);
    console.log(`   - Cuenta Contable: ${result.planCuenta.cuentaContable}`);
    console.log(
      `   - SQL esperado: INSERT INTO CNT.DTPL (..., PLNNCDGO, PLNSCDGO, ...) VALUES (..., ${nuevoDetalle.planCuenta.codigo}, ${nuevoDetalle.plantilla.codigo}, ...)`
    );

    // Intentar diferentes formatos de datos para el backend
    this.intentarGuardarDetalle(nuevoDetalle, result);
  }

  /**
   * Procesa la edición de un detalle existente
   */
  private procesarEdicionDetalle(detalle: DetallePlantilla, result: any): void {
    const detalleActualizado: any = {
      codigo: detalle.codigo,
      plantilla: { codigo: this.plantillaSeleccionada!.codigo },
      planCuenta: result.planCuenta,
      descripcion: result.descripcion,
      movimiento: result.movimiento,
      // Formatear fechas para LocalDateTime (sin timezone)
      fechaDesde: this.funcionesDatosService.formatearFechaParaBackend(result.fechaDesde),
      fechaHasta: this.funcionesDatosService.formatearFechaParaBackend(result.fechaHasta),
      estado: result.estado,
      fechaInactivo:
        result.estado === 2
          ? this.funcionesDatosService.formatearFechaParaBackend(
              detalle.fechaInactivo || new Date()
            )
          : null,
      // Campos auxiliares preservados del detalle original o valores por defecto
      auxiliar1: detalle.auxiliar1 || 0,
      auxiliar2: detalle.auxiliar2 || 0,
      auxiliar3: detalle.auxiliar3 || 0,
      auxiliar4: detalle.auxiliar4 || 0,
      auxiliar5: detalle.auxiliar5 || 0,
    };

    this.detallePlantillaService.update(detalleActualizado).subscribe({
      next: (detalleGuardado) => {
        if (detalleGuardado) {
          this.cargarDetalles(this.plantillaSeleccionada!.codigo);
          this.showMessage('Detalle actualizado correctamente', 'success');
        } else {
          this.showMessage('Error al actualizar el detalle', 'error');
        }
      },
      error: (error) => {
        console.error('Error al actualizar detalle:', error);
        // Fallback: actualizar solo en memoria para demo
        const actualizado: DetallePlantilla = {
          ...detalle,
          ...result,
          fechaInactivo: result.estado === 2 ? detalle.fechaInactivo || new Date() : undefined,
        };
        this.dataSourceDetalles.data = this.dataSourceDetalles.data.map((d) =>
          d.codigo === detalle.codigo ? actualizado : d
        );
        this.showMessage('Detalle actualizado (modo demo)', 'success');
      },
    });
  }

  /**
   * Función de diagnóstico para verificar planes de cuenta
   * Ayuda a identificar incompatibilidades entre frontend y backend
   */
  verificarPlanesCuenta(): void {
    // Obtener planes de cuenta reales del servidor
    this.planCuentaService.selectByCriteria([]).subscribe({
      next: (planes) => {
        this.mostrarDiagnosticoPlanes(planes || []);
      },
      error: (error) => {
        console.log('❌ Error al cargar planes reales, usando fallback getAll...');
        this.planCuentaService.getAll().subscribe({
          next: (planesFallback) => {
            this.mostrarDiagnosticoPlanes(planesFallback || []);
          },
          error: (errorFallback) => {
            console.error('❌ Error en ambos métodos:', errorFallback);
            this.showMessage('❌ Error al cargar planes de cuenta del servidor', 'error');
          },
        });
      },
    });
  }

  private mostrarDiagnosticoPlanes(planesDemoLocal: any[]): void {
    console.log('🔍 DIAGNÓSTICO DE PLANES DE CUENTA');
    console.log('=================================');
    console.log(`📋 Planes disponibles en demo local: ${planesDemoLocal.length}`);

    planesDemoLocal.forEach((plan) => {
      console.log(
        `  [${plan.codigo}] ${plan.cuentaContable} - ${plan.nombre} (Nivel: ${plan.nivel})`
      );
    });

    console.log('\n💡 DIAGNÓSTICO DEL PROBLEMA FK_DTPL_PLNN:');
    console.log('💡 1. Verificar que estos códigos [1,2,3,etc] existan en CNT.PLNN del servidor');
    console.log('💡 2. Los códigos mostrados son los PK que el frontend intenta insertar');
    console.log('💡 3. El servidor rechaza porque no encuentra la FK en la tabla padre');
    console.log('💡 4. Verificar: SELECT CODIGO FROM CNT.PLNN WHERE CODIGO IN (1,2,3,4,5,6)');
    console.log('💡 5. Si no existen, insertar datos de prueba o ajustar códigos del frontend');

    this.showMessage(
      `📊 Diagnóstico ejecutado. Ver consola para detalles de ${planesDemoLocal.length} planes de cuenta.`,
      'info'
    );
  }

  /**
   * Ordena los planes de cuenta jerárquicamente como en plan-grid
   * Convierte números de cuenta jerárquicos a formato ordenable
   */
  private ordenarPlanesCuentaJerarquicamente(planes: any[]): any[] {
    return planes.sort((a, b) => {
      const aNumber = this.getAccountNumberForSorting(a.cuentaContable || '');
      const bNumber = this.getAccountNumberForSorting(b.cuentaContable || '');
      return aNumber.localeCompare(bNumber);
    });
  }

  /**
   * Convierte un número de cuenta jerárquico a un formato que se puede ordenar correctamente
   * Ejemplos:
   * "1" -> "0001"
   * "1.1" -> "0001.0001"
   * "1.1.01" -> "0001.0001.0001"
   * "2.15.123" -> "0002.0015.0123"
   */
  private getAccountNumberForSorting(accountNumber: string): string {
    if (!accountNumber) return '0000';

    // Si no tiene puntos, es un número simple
    if (!accountNumber.includes('.')) {
      const numPart = parseInt(accountNumber.trim()) || 0;
      return numPart.toString().padStart(4, '0');
    }

    // Dividir por puntos y convertir cada parte a número con padding
    const parts = accountNumber.split('.');
    const paddedParts = parts.map((part) => {
      // Remover espacios y convertir a número
      const numPart = parseInt(part.trim()) || 0;
      // Agregar padding de 4 dígitos para ordenamiento correcto
      return numPart.toString().padStart(4, '0');
    });

    return paddedParts.join('.');
  }

  /**
   * Función para testear un plan de cuenta específico contra el servidor
   * Útil para verificar qué códigos existen realmente en el servidor
   */
  testearPlanCuentaEspecifico(codigoPlan: number): void {
    console.log(`🧪 Testeando disponibilidad del plan de cuenta [${codigoPlan}] en el servidor...`);

    // Crear un detalle de prueba mínimo
    const detallePrueba = {
      plantilla: { codigo: this.plantillaSeleccionada?.codigo || 1 },
      planCuenta: { codigo: codigoPlan },
      descripcion: 'TEST - Verificación de integridad FK',
      movimiento: 1,
      estado: 1,
      auxiliar1: 0,
      auxiliar2: 0,
      auxiliar3: 0,
      auxiliar4: 0,
      auxiliar5: 0,
    };

    this.detallePlantillaService.add(detallePrueba).subscribe({
      next: (resultado) => {
        console.log(`✅ Plan [${codigoPlan}] existe en el servidor`);
        this.showMessage(`✅ Plan de cuenta [${codigoPlan}] disponible en servidor`, 'success');
      },
      error: (error) => {
        if (this.esErrorIntegridad(error)) {
          console.log(`❌ Plan [${codigoPlan}] NO existe en el servidor (FK_DTPL_PLNN)`);
          this.showMessage(`❌ Plan [${codigoPlan}] no existe en servidor`, 'error');
        } else {
          console.log(`⚠️ Plan [${codigoPlan}] - Error diferente: ${error.status}`);
          this.showMessage(`⚠️ Error diferente para plan [${codigoPlan}]: ${error.status}`, 'warn');
        }
      },
    });
  }

  /**
   * Método nuclear para reconstruir completamente la tabla
   * ÚLTIMA OPCIÓN: reconstruye la tabla paso a paso con intervalos
   */
  reconstruirTablaCompleta(): void {
    console.log('💣 MÉTODO NUCLEAR: Reconstruyendo tabla completa');

    // 1. Guardar datos actuales
    const datosActuales = [...(this.dataSourceDetalles?.data || [])];
    console.log('💾 Datos guardados:', datosActuales.length);

    // 2. Destruir tabla completamente
    this.displayedColumnsDetalles = [];
    this.dataSourceDetalles.data = [];

    console.log('💥 Tabla destruida');

    // 3. Esperar un ciclo y reconstruir paso a paso
    setTimeout(() => {
      console.log('🔄 Paso 1: Agregando codigoCuenta');
      this.displayedColumnsDetalles = ['codigoCuenta'];

      setTimeout(() => {
        console.log('🔄 Paso 2: Agregando descripcion');
        this.displayedColumnsDetalles = ['codigoCuenta', 'descripcion'];

        setTimeout(() => {
          console.log('🔄 Paso 3: Agregando movimiento');
          this.displayedColumnsDetalles = ['codigoCuenta', 'descripcion', 'movimiento'];

          setTimeout(() => {
            console.log('🔄 Paso 4: Agregando estado');
            this.displayedColumnsDetalles = ['codigoCuenta', 'descripcion', 'movimiento', 'estado'];

            setTimeout(() => {
              console.log('🔄 Paso 5: Agregando acciones');
              this.displayedColumnsDetalles = [
                'codigoCuenta',
                'descripcion',
                'movimiento',
                'estado',
                'acciones',
              ];

              setTimeout(() => {
                // Restaurar datos al final
                console.log('🔄 Paso 6: Restaurando datos');
                this.dataSourceDetalles.data = datosActuales;

                console.log('✅ TABLA RECONSTRUIDA COMPLETAMENTE');
                console.log('📊 Columnas finales:', this.displayedColumnsDetalles);
                console.log('📋 Datos restaurados:', this.dataSourceDetalles.data.length);

                // Debug final
                setTimeout(() => {
                  this.debugDetalles();
                  this.showMessage(
                    '💣 Tabla reconstruida completamente. Verificar columnas ahora.',
                    'success'
                  );
                }, 200);
              }, 150);
            }, 150);
          }, 150);
        }, 150);
      }, 150);
    }, 150);
  }
}
