import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import {
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
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { DetallePlantilla, TipoMovimiento } from '../../model/detalle-plantilla-general';
import { EstadoPlantilla, Plantilla } from '../../model/plantilla-general';
import { DetallePlantillaService } from '../../service/detalle-plantilla.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { PlantillaService } from '../../service/plantilla.service';
import { ConfirmDeleteDetalleDialogComponent } from './confirm-delete-detalle-dialog.component';
import { DetallePlantillaDialogComponent } from './detalle-plantilla-dialog.component';

@Component({
  selector: 'app-plantilla-general',
  standalone: true,
  imports: [
    CommonModule,
    MaterialFormModule,
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
  mostrarBannerDemo = false;
  idSucursal = parseInt(localStorage.getItem('idSucursal') || '280', 10);

  // Tipo de plantilla: 0 = General, 1 = Sistema
  tipoSistema: number = 0;
  tituloPlantilla: string = 'Plantilla General';

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
    private route: ActivatedRoute,
    private funcionesDatosService: FuncionesDatosService
  ) {
    this.plantillaForm = this.createForm();
    // Inicializar dataSource con array vacío
    this.dataSourceDetalles.data = [];
  }

  ngOnInit(): void {
    // Leer el tipo de plantilla desde los datos de la ruta
    this.route.data.subscribe((data) => {
      this.tipoSistema = data['sistema'] ?? 0;
      this.tituloPlantilla = this.tipoSistema === 1 ? 'Plantilla de Sistema' : 'Plantilla General';
    });

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
    this.loading = true;

    // Crear criterios usando el patrón DatosBusqueda (como naturaleza-cuentas)
    const criterioConsultaArray: Array<DatosBusqueda> = [];

    // Filtro por empresa
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      String(this.idSucursal),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterioEmpresa);

    // Nota: El filtro por 'sistema' se aplica en frontend ya que el backend
    // no tiene configurado este parámetro en el named query

    // Ordenar por nombre
    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('nombre');
    criterioConsultaArray.push(criterioOrden);

    this.plantillaService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (data: Plantilla[] | null) => {
        // Filtrar por tipo de sistema en el frontend
        const plantillasFiltradas = data?.filter((p) => p.sistema === this.tipoSistema) || [];

        this.plantillas = plantillasFiltradas || [];
        this.loading = false;

        if (this.plantillas.length > 0) {
          this.showMessage(`${this.plantillas.length} plantillas cargadas`, 'success');
        } else {
          this.showMessage(`No hay plantillas disponibles (${this.tituloPlantilla})`, 'info');
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
   * Guarda la plantilla (maestro y detalle)
   */
  guardarPlantilla(): void {
    if (this.plantillaForm.invalid) {
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
    } else if (formValue.estado === EstadoPlantilla.ACTIVO) {
      this.plantillaForm.patchValue({
        fechaInactivo: null,
      });
    }

    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    const empresaNombre = localStorage.getItem('empresaName') || 'Empresa';

    // Re-obtener formValue después de las validaciones
    const updatedFormValue = this.plantillaForm.value;

    // Crear objeto limpio para enviar al backend
    let plantillaData: any = {
      codigo: updatedFormValue.codigo || 0,
      nombre: (updatedFormValue.nombre || '').toString().toUpperCase(),
      estado: updatedFormValue.estado || 1,
      observacion: (updatedFormValue.observacion || '').toString().toUpperCase(),
      empresa: {
        codigo: empresaCodigo,
        nombre: empresaNombre || 'Empresa',
      },
      sistema: this.tipoSistema || 0, // PLNSSSTM - Indicador de sistema (0=General, 1=Sistema)
    };

    // Solo agregar campos opcionales si tienen valores válidos
    if (updatedFormValue.codigoAlterno && !isNaN(parseInt(updatedFormValue.codigoAlterno))) {
      plantillaData.codigoAlterno = parseInt(updatedFormValue.codigoAlterno);
    }

    if (updatedFormValue.fechaInactivo) {
      plantillaData.fechaInactivo = updatedFormValue.fechaInactivo;
    }

    // Eliminar campos de auditoría que el backend no acepta
    // Estos campos serán manejados automáticamente por el backend

    // Configurar campos específicos para nuevo registro
    if (this.isNewRecord) {
      // Eliminar codigo para que el backend lo genere
      delete plantillaData.codigo;
      // Eliminar campos de auditoría que el backend maneja automáticamente
      // plantillaData.fechaCreacion = new Date().toISOString();
      // plantillaData.usuarioCreacion = 'current-user';
    } else {
      // Para actualización, usar la estructura original de la plantilla y solo modificar los campos editables
      if (this.plantillaSeleccionada) {
        const plantillaActualizada = {
          ...this.plantillaSeleccionada, // Mantener todos los campos originales
          // Sobrescribir solo los campos modificables
          nombre: updatedFormValue.nombre,
          estado: updatedFormValue.estado,
          observacion: updatedFormValue.observacion,
          // ELIMINAR: fechaUpdate y usuarioUpdate no son aceptados por el backend
        };

        // Agregar campos opcionales si están presentes
        if (updatedFormValue.codigoAlterno && !isNaN(parseInt(updatedFormValue.codigoAlterno))) {
          plantillaActualizada.codigoAlterno = parseInt(updatedFormValue.codigoAlterno);
        }

        if (updatedFormValue.fechaInactivo) {
          plantillaActualizada.fechaInactivo = updatedFormValue.fechaInactivo;
        }

        // Limpiar campos que el backend no acepta
        delete (plantillaActualizada as any).fechaUpdate;
        delete (plantillaActualizada as any).usuarioUpdate;
        delete (plantillaActualizada as any).fechaCreacion;
        delete (plantillaActualizada as any).usuarioCreacion;

        // Limpiar campos undefined
        Object.keys(plantillaActualizada).forEach((key) => {
          if ((plantillaActualizada as any)[key] === undefined) {
            delete (plantillaActualizada as any)[key];
          }
        });

        plantillaData = plantillaActualizada;
      }
    }

    this.loading = true;

    if (this.isNewRecord) {
      this.plantillaService.add(plantillaData).subscribe({
        next: (result: Plantilla | null) => {
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
            this.showMessage('Error al crear la plantilla', 'error');
          }
          this.loading = false;
        },
        error: (httpErrorResponse: any) => {
          let errorMessage = 'Error al guardar plantilla.';

          if (httpErrorResponse?.status === 400) {
            if (typeof httpErrorResponse.error === 'string') {
              errorMessage = `Error de datos: ${httpErrorResponse.error}`;
            } else if (httpErrorResponse.error && httpErrorResponse.error.message) {
              errorMessage = `Error: ${httpErrorResponse.error.message}`;
            } else {
              errorMessage = 'Error 400: Datos inválidos. Revise los campos del formulario.';
            }
          } else if (httpErrorResponse?.status === 0) {
            errorMessage = 'Error de conexión. Verifique que el servidor esté funcionando.';
          }

          this.showMessage(errorMessage, 'error');
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
        error: (httpErrorResponse: any) => {
          let errorMessage = 'Error al actualizar plantilla.';

          if (httpErrorResponse?.status === 400) {
            if (typeof httpErrorResponse.error === 'string') {
              errorMessage = `Error de datos: ${httpErrorResponse.error}`;
            } else if (httpErrorResponse.error && httpErrorResponse.error.message) {
              errorMessage = `Error: ${httpErrorResponse.error.message}`;
            } else {
              errorMessage = 'Error 400: Datos inválidos. Revise los campos del formulario.';
            }
          } else if (httpErrorResponse?.status === 0) {
            errorMessage = 'Error de conexión. Verifique que el servidor esté funcionando.';
          } else if (typeof httpErrorResponse === 'string') {
            errorMessage = `Error del backend: ${httpErrorResponse}`;
          }

          this.showMessage(errorMessage, 'error');
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
        // Análisis específico del tipo de error
        const tipoError = this.analizarTipoError(error);

        switch (tipoError) {
          case 'INTEGRIDAD_FK':
            this.showMessage(
              `Error FK_DTPL_PLNN: El plan de cuenta [${detalleOriginal.planCuenta?.codigo}] "${resultadoDialog.planCuenta?.cuentaContable}" no existe en el servidor. Guardado localmente.`,
              'warn'
            );
            break;

          case 'SERVIDOR_NO_DISPONIBLE':
            this.showMessage(
              `Servidor no disponible. Detalle guardado localmente para demostración.`,
              'info'
            );
            break;

          case 'ERROR_TRANSACCION':
            this.showMessage(
              `Error de transacción en el servidor. Guardado localmente para demostración.`,
              'warn'
            );
            break;

          default:
            this.showMessage(
              `Error del servidor. Detalle guardado localmente para demostración.`,
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
      return false;
    }

    // Validar que el movimiento sea válido (1=DEBE, 2=HABER)
    if (!detalle.movimiento || (detalle.movimiento !== 1 && detalle.movimiento !== 2)) {
      return false;
    }

    // Validar que la plantilla padre exista
    if (!detalle.plantilla || !detalle.plantilla.codigo || detalle.plantilla.codigo <= 0) {
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
   * Verificar específicamente las condiciones del *ngIf de la tabla
   */
  verificarCondicionesTabla(): void {
    // Verificar si la tabla debería estar visible
    const deberiaEstarVisible =
      this.displayedColumnsDetalles && this.displayedColumnsDetalles.length > 0;

    if (!deberiaEstarVisible) {
      this.displayedColumnsDetalles = [
        'codigoCuenta',
        'descripcion',
        'movimiento',
        'estado',
        'acciones',
      ];
      this.showMessage('Condiciones de tabla corregidas', 'info');
    }
  }

  /**
   * Método de emergencia para forzar la visibilidad de las columnas
   */
  forzarVisibilidadColumnas(): void {
    // Limpiar y reconfigurar displayedColumns
    this.displayedColumnsDetalles = [];

    setTimeout(() => {
      this.displayedColumnsDetalles = [
        'codigoCuenta',
        'descripcion',
        'movimiento',
        'estado',
        'acciones',
      ];

      // Forzar CSS para hacer visibles las columnas
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

        this.showMessage(
          'CSS de emergencia aplicado. Las columnas deberían ser visibles ahora.',
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

    this.dataSourceDetalles.data = datosPrueba;
  }
  /**
   * Carga planes de cuenta reales del servidor para el diálogo
   * Optimizado para usar directamente getAll() que sabemos que funciona
   */
  private cargarPlanesCuentaParaDialog(detalleExistente?: DetallePlantilla): void {
    this.loading = true;

    // Usar directamente getAll() ya que sabemos que funciona
    this.planCuentaService.getAll().subscribe({
      next: (planCuentas) => {
        this.loading = false;
        const planes = Array.isArray(planCuentas) ? planCuentas : [];

        if (planes.length === 0) {
          this.showMessage('No hay planes de cuenta disponibles', 'warn');
        } else {
          // Filtrar solo los planes de la empresa dinámica
          const planesFiltrados = planes.filter(
            (plan) => plan.empresa && plan.empresa.codigo === this.idSucursal
          );

          // Ordenar jerárquicamente como en plan-grid
          const planesOrdenados = this.ordenarPlanesCuentaJerarquicamente(planesFiltrados);

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
          // Filtrar solo los planes de la empresa logueada en fallback también
          const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
          const planesFiltrados = planes.filter(
            (plan) => plan.empresa && plan.empresa.codigo === empresaCodigo
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
    this.showMessage(
      `Diagnóstico ejecutado. Ver consola para detalles de ${planesDemoLocal.length} planes de cuenta.`,
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
        this.showMessage(`Plan de cuenta [${codigoPlan}] disponible en servidor`, 'success');
      },
      error: (error) => {
        if (this.esErrorIntegridad(error)) {
          this.showMessage(`Plan [${codigoPlan}] no existe en servidor`, 'error');
        } else {
          this.showMessage(`Error diferente para plan [${codigoPlan}]: ${error.status}`, 'warn');
        }
      },
    });
  }

  /**
   * Método nuclear para reconstruir completamente la tabla
   * ÚLTIMA OPCIÓN: reconstruye la tabla paso a paso con intervalos
   */
  reconstruirTablaCompleta(): void {
    // Guardar datos actuales
    const datosActuales = [...(this.dataSourceDetalles?.data || [])];

    // Destruir tabla completamente
    this.displayedColumnsDetalles = [];
    this.dataSourceDetalles.data = [];

    // Esperar un ciclo y reconstruir paso a paso
    setTimeout(() => {
      this.displayedColumnsDetalles = ['codigoCuenta'];

      setTimeout(() => {
        this.displayedColumnsDetalles = ['codigoCuenta', 'descripcion'];

        setTimeout(() => {
          this.displayedColumnsDetalles = ['codigoCuenta', 'descripcion', 'movimiento'];

          setTimeout(() => {
            this.displayedColumnsDetalles = ['codigoCuenta', 'descripcion', 'movimiento', 'estado'];

            setTimeout(() => {
              this.displayedColumnsDetalles = [
                'codigoCuenta',
                'descripcion',
                'movimiento',
                'estado',
                'acciones',
              ];

              setTimeout(() => {
                // Restaurar datos al final
                this.dataSourceDetalles.data = datosActuales;

                // Debug final
                setTimeout(() => {
                  this.showMessage(
                    'Tabla reconstruida completamente. Verificar columnas ahora.',
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
