import { Component, OnInit, Input, inject, signal, computed, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';
import { catchError } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Entidad } from '../../../model/entidad';
import { Filial } from '../../../model/filial';
import { TipoIdentificacion } from '../../../model/tipo-identificacion';
import { TipoHidrocarburifica } from '../../../model/tipo-hidrocarburifica';
import { TipoVivienda } from '../../../model/tipo-vivienda';
import { EntidadService } from '../../../service/entidad.service';
import { FilialService } from '../../../service/filial.service';
import { TipoIdentificacionService } from '../../../service/tipo-identificacion.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';

/**
 * Componente reutilizable para gestión de entidades.
 *
 * Modos de uso:
 *
 * 1. Modo formulario completo (crear/editar):
 *    <app-participe-info></app-participe-info>
 *
 * 2. Modo filtrado por código (visualizar entidad específica):
 *    <app-participe-info
 *      [codigoEntidad]="123"
 *      [modoFiltrado]="true">
 *    </app-participe-info>
 *
 * 3. Modo solo lectura (visualización):
 *    <app-participe-info
 *      [codigoEntidad]="123"
 *      [modoFiltrado]="true"
 *      [soloLectura]="true">
 *    </app-participe-info>
 *
 * 4. Modo embebido (sin botones):
 *    <app-participe-info
 *      [codigoEntidad]="123"
 *      [modoFiltrado]="true"
 *      [ocultarBotones]="true">
 *    </app-participe-info>
 *
 * Métodos públicos:
 * - filtrarPorCodigo(codigo: number): Carga una entidad específica
 * - limpiarFiltro(): Limpia el filtro y resetea el formulario
 * - obtenerEntidadActual(): Retorna la entidad actualmente cargada
 */

@Component({
  selector: 'app-entidad-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MaterialFormModule
  ],
  templateUrl: './entidad-edit.component.html',
  styleUrl: './entidad-edit.component.scss'
})
export class EntidadEditComponent implements OnInit, OnChanges, OnDestroy {

  // Inputs para filtrado y configuración
  @Input() codigoEntidad?: number; // Código específico de entidad a filtrar
  @Input() modoFiltrado: boolean = false; // Si true, carga entidad específica
  @Input() soloLectura: boolean = false; // Si true, formulario en modo solo lectura
  @Input() ocultarBotones: boolean = false; // Si true, oculta botones de acción

  // Subscriptions para cleanup
  private subscriptions = new Subscription();

  // Servicios
  private fb = inject(FormBuilder);
  private entidadService = inject(EntidadService);
  private filialService = inject(FilialService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private tipoIdentificacionService = inject(TipoIdentificacionService);
  private snackBar = inject(MatSnackBar);
  private funcionesDatosService = inject(FuncionesDatosService);

  // Señales para estado reactivo
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  errorMsg = signal<string>('');
  modoEdicion = signal<boolean>(false);
  entidadActual = signal<Entidad | null>(null);
  formValid = signal<boolean>(false); // Nueva señal para validez del formulario

  // Formularios reactivos
  entidadForm!: FormGroup;

  // Opciones para selects
  estadosOptions = [
    { value: 1, label: 'Activo' },
    { value: 0, label: 'Inactivo' }
  ];

  sectorPublicoOptions = [
    { value: 1, label: 'Sí' },
    { value: 0, label: 'No' }
  ];

  // Opciones para selects de entidades relacionadas
  filialesOptions: Filial[] = [];

  tiposIdentificacionOptions: TipoIdentificacion[] = [];
  loadingFiliales = signal<boolean>(false);

  loadingTiposId = signal<boolean>(false);

  // Computed signals
  hasError = computed(() => this.errorMsg() !== '');
  isFormValid = computed(() => this.formValid()); // Ahora usa la señal reactiva
  formTitle = computed(() => this.modoEdicion() ? 'Editar Partícipe' : 'Nuevo Partícipe');

  ngOnInit(): void {
    this.inicializarFormulario();

    // Obtener datos pre-cargados del resolver
    const resolvedData = this.route.snapshot.data['data'];
    if (resolvedData) {
      this.filialesOptions = resolvedData.filiales || [];
      this.tiposIdentificacionOptions = resolvedData.tiposIdentificacion || [];
    } else {
      // Fallback: cargar datos si no hay resolver (modo standalone)
      this.cargarDatosSelect();
    }

    // Verificar si hay código de entidad en los query params (versión síncrona)
    const params = this.route.snapshot.queryParams;
    const codigoEntidadParam = params['codigoEntidad'];

    if (codigoEntidadParam) {
      const codigo = Number(codigoEntidadParam);
      this.modoFiltrado = true;
      this.codigoEntidad = codigo;
      this.cargarEntidadPorCodigo(codigo);
    } else if (this.modoFiltrado && this.codigoEntidad) {
      // Si hay código de entidad por Input, cargar la entidad específica
      this.cargarEntidadPorCodigo(this.codigoEntidad);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cambios en codigoEntidad
    if (changes['codigoEntidad'] && !changes['codigoEntidad'].firstChange) {
      const nuevoCodigo = changes['codigoEntidad'].currentValue;
      if (nuevoCodigo && this.modoFiltrado) {
        this.cargarEntidadPorCodigo(nuevoCodigo);
      } else {
        this.limpiarFormulario();
      }
    }

    // Detectar cambios en soloLectura
    if (changes['soloLectura'] && this.entidadForm) {
      if (this.soloLectura) {
        this.entidadForm.disable();
      } else {
        this.entidadForm.enable();
      }
    }
  }

  cargarDatosSelect(): void {
    // Cargar filiales
    this.loadingFiliales.set(true);
    const filialSub = this.filialService.getAll().subscribe({
      next: (filiales) => {
        this.loadingFiliales.set(false);
        if (filiales && filiales.length > 0) {
          this.filialesOptions = filiales;
        }
      },
      error: (error) => {
        this.loadingFiliales.set(false);
      }
    });
    this.subscriptions.add(filialSub);



    // Cargar tipos identificación
    this.loadingTiposId.set(true);
    const tipoIdSub = this.tipoIdentificacionService.getAll().subscribe({
      next: (tipos) => {
        this.loadingTiposId.set(false);
        if (tipos && tipos.length > 0) {
          this.tiposIdentificacionOptions = tipos;
        }
      },
      error: (error) => {
        this.loadingTiposId.set(false);
      }
    });
    this.subscriptions.add(tipoIdSub);
  }

  inicializarFormulario(): void {
    this.entidadForm = this.fb.group({
      // Básicos
      codigo: [{ value: null, disabled: true }],
      filial: [null as Filial | null],

      // Tipos (objetos relacionados)
      tipoHidrocarburifica: [null as TipoHidrocarburifica | null],
      tipoIdentificacion: [null as TipoIdentificacion | null],
      tipoVivienda: [null as TipoVivienda | null],

      // Identificación
      numeroIdentificacion: ['', [Validators.required, Validators.maxLength(20)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
      nombreComercial: ['', [Validators.maxLength(200)]],
      fechaNacimiento: [null],

      // Contacto
      correoPersonal: ['', [Validators.email, Validators.maxLength(100)]],
      correoInstitucional: ['', [Validators.email, Validators.maxLength(100)]],
      telefono: ['', [Validators.maxLength(20)]],
      movil: ['', [Validators.maxLength(20)]],

      // Opciones booleanas
      tieneCorreoPersonal: [0],
      tieneCorreoTrabajo: [0],
      tieneTelefono: [0],

      // Información adicional
      numeroCargasFamiliares: [0, [Validators.min(0)]],
      sectorPublico: [0],
      idCiudad: [''],
      porcentajeSimilitud: [0, [Validators.min(0), Validators.max(100)]],
      busqueda: [''],

      // Estado y migración
      idEstado: [1, [Validators.required]],
      migrado: [0],

      // Metadata (solo lectura)
      urlFotoLogo: [''],
      usuarioIngreso: [{ value: '', disabled: true }],
      fechaIngreso: [{ value: null, disabled: true }],
      usuarioModificacion: [{ value: '', disabled: true }],
      fechaModificacion: [{ value: null, disabled: true }],
      ipIngreso: [{ value: '', disabled: true }],
      ipModificacion: [{ value: '', disabled: true }]
    });

    // Suscribirse a cambios del formulario para actualizar la señal
    const formStatusSub = this.entidadForm.statusChanges.subscribe(() => {
      this.formValid.set(this.entidadForm.valid);
    });
    this.subscriptions.add(formStatusSub);

    // Inicializar el estado del formulario
    this.formValid.set(this.entidadForm.valid);
  }

  debugFormErrors(): void {
    Object.keys(this.entidadForm.controls).forEach(key => {
      const control = this.entidadForm.get(key);
      if (control?.invalid) {
        // Errores de formulario (mantenido para depuración manual si es necesario)
      }
    });
  }

  /**
   * Regresa a la pantalla anterior con el código de entidad como query param
   */
  regresar(): void {
    // Obtener el returnUrl y codigoEntidad de los query params de forma síncrona
    const params = this.route.snapshot.queryParams;
    const returnUrl = params['returnUrl'];
    const codigoEntidad = params['codigoEntidad'];

    if (returnUrl) {
      // Navegar de regreso con el código de entidad si existe
      const queryParams = codigoEntidad ? { codigoEntidad: codigoEntidad } : {};
      this.router.navigate([returnUrl], { queryParams });
    } else {
      // Si no hay returnUrl, navegar a entidad-consulta por defecto
      this.router.navigate(['/menucreditos/entidad-consulta']);
    }
  }

  limpiarFormulario(): void {
    this.entidadForm.reset();
    this.entidadForm.patchValue({
      codigo: '',
      filial: null,

      tipoIdentificacion: null,
      numeroCargasFamiliares: 0,
      sectorPublico: 0,
      tieneCorreoPersonal: 0,
      tieneCorreoTrabajo: 0,
      tieneTelefono: 0,
      idEstado: 1,
      migrado: 0,
      porcentajeSimilitud: 0
    });
    this.modoEdicion.set(false);
    this.entidadActual.set(null);
    this.errorMsg.set('');

    // Limpiar también el código de entidad y modo filtrado
    this.codigoEntidad = undefined;
    this.modoFiltrado = false;
  }

  cargarEntidad(id: number): void {
    this.loading.set(true);
    this.errorMsg.set('');

    this.entidadService.getById(id.toString()).subscribe({
      next: (entidad) => {
        this.loading.set(false);
        if (entidad) {
          this.entidadActual.set(entidad);
          this.modoEdicion.set(true);
          this.llenarFormulario(entidad);
        } else {
          this.mostrarError('Entidad no encontrada');
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.mostrarError(`Error al cargar entidad: ${error.message}`);
      }
    });
  }

  llenarFormulario(entidad: Entidad): void {
    this.entidadForm.patchValue({
      codigo: entidad.codigo,
      filial: entidad.filial || null,
      tipoHidrocarburifica: entidad.tipoHidrocarburifica || null,
      tipoIdentificacion: entidad.tipoIdentificacion || null,
      tipoVivienda: entidad.tipoVivienda || null,
      numeroIdentificacion: entidad.numeroIdentificacion,
      razonSocial: entidad.razonSocial,
      nombreComercial: entidad.nombreComercial,
      fechaNacimiento: entidad.fechaNacimiento ? new Date(entidad.fechaNacimiento) : null,
      correoPersonal: entidad.correoPersonal,
      correoInstitucional: entidad.correoInstitucional,
      telefono: entidad.telefono,
      movil: entidad.movil,
      tieneCorreoPersonal: entidad.tieneCorreoPersonal || 0,
      tieneCorreoTrabajo: entidad.tieneCorreoTrabajo || 0,
      tieneTelefono: entidad.tieneTelefono || 0,
      numeroCargasFamiliares: entidad.cargasFamiliares || 0,
      sectorPublico: entidad.sectorPublico || 0,
      idCiudad: entidad.idCiudad,
      porcentajeSimilitud: entidad.porcentajeSimilitud || 0,
      busqueda: entidad.busqueda,
      idEstado: entidad.idEstado,
      migrado: entidad.migrado || 0,
      urlFotoLogo: entidad.urlFotoLogo,
      usuarioIngreso: entidad.usuarioIngreso,
      fechaIngreso: entidad.fechaIngreso,
      usuarioModificacion: entidad.usuarioModificacion,
      ipIngreso: entidad.ipIngreso,
      ipModificacion: entidad.ipModificacion
    });
  }

  guardar(): void {
    if (this.entidadForm.valid) {
      this.saving.set(true);
      this.errorMsg.set('');

      const formValue = this.entidadForm.getRawValue();
      const entidadData = this.prepararDatos(formValue);

      const operacion = this.modoEdicion() ?
        this.entidadService.update(entidadData) :
        this.entidadService.add(entidadData);

        operacion.subscribe({
        next: (resultado) => {
          this.saving.set(false);
          if (resultado) {
            const mensaje = this.modoEdicion() ? 'Entidad actualizada exitosamente' : 'Entidad creada exitosamente';
            this.mostrarExito(mensaje);

            if (!this.modoEdicion()) {
              this.limpiarFormulario();
            } else {
              this.entidadActual.set(resultado);
              this.llenarFormulario(resultado);
            }
          } else {
            this.mostrarError('Error en la operación');
          }
        },
        error: (error) => {
          this.saving.set(false);
          this.mostrarError(`Error al guardar: ${error.message || 'Error desconocido'}`);
        }
      });
    } else {
      this.marcarCamposInvalidos();
      this.mostrarError('Por favor, corrija los errores en el formulario');
    }
  }

  cargarEntidadPorCodigo(codigo: number): void {
    if (!codigo) return;

    this.loading.set(true);
    this.errorMsg.set('');

    // Usar getById enviando el código como string
    this.entidadService.getById(codigo.toString()).subscribe({
      next: (entidad) => {
        this.loading.set(false);
        if (entidad) {
          this.entidadActual.set(entidad);
          this.modoEdicion.set(true);
          this.llenarFormulario(entidad);

          // Si está en modo solo lectura, deshabilitar formulario
          if (this.soloLectura) {
            this.entidadForm.disable();
          }
        } else {
          this.errorMsg.set(`No se encontró entidad con código: ${codigo}`);
          this.limpiarFormulario();
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMsg.set('Error al cargar la entidad');

        this.snackBar.open('Error al cargar la entidad', 'Cerrar', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // Método público para uso desde componentes padre
  public filtrarPorCodigo(codigo: number): void {
    this.codigoEntidad = codigo;
    this.modoFiltrado = true;
    this.cargarEntidadPorCodigo(codigo);
  }

  // Método público para limpiar filtros
  public limpiarFiltro(): void {
    this.codigoEntidad = undefined;
    this.modoFiltrado = false;
    this.limpiarFormulario();
  }

  // Método público para obtener la entidad actual
  public obtenerEntidadActual(): Entidad | null {
    return this.entidadActual();
  }

  prepararDatos(formValue: any): Partial<Entidad> {
    const datos: Partial<Entidad> = {
      ...formValue,
      // Los objetos ya vienen completos del formulario, no necesitamos reconstruirlos
      filial: formValue.filial || undefined,
      tipoHidrocarburifica: formValue.tipoHidrocarburifica || undefined,
      TipoIdentificacion: formValue.TipoIdentificacion || undefined,
      TipoVivienda: formValue.TipoVivienda || undefined,
      // Convertir fechas al formato yyyy-MM-dd HH:mm:ss usando el servicio centralizado
      fechaNacimiento: this.funcionesDatosService.formatearFechaParaBackend(formValue.fechaNacimiento) as any,
      // Convertir checkboxes a números
      tieneCorreoPersonal: formValue.tieneCorreoPersonal ? 1 : 0,
      tieneCorreoTrabajo: formValue.tieneCorreoTrabajo ? 1 : 0,
      tieneTelefono: formValue.tieneTelefono ? 1 : 0,
      sectorPublico: formValue.sectorPublico ? 1 : 0,
      migrado: formValue.migrado ? 1 : 0
    };

    // No enviar campos de metadata disabled al backend (los maneja automáticamente)
    delete (datos as any).usuarioIngreso;
    delete (datos as any).fechaIngreso;
    delete (datos as any).usuarioModificacion;
    delete (datos as any).fechaModificacion;
    delete (datos as any).ipIngreso;
    delete (datos as any).ipModificacion;

    return datos;
  }

  marcarCamposInvalidos(): void {
    Object.keys(this.entidadForm.controls).forEach(key => {
      const control = this.entidadForm.get(key);
      if (control && control.invalid) {
        control.markAsTouched();
      }
    });
  }

  obtenerErrorCampo(nombreCampo: string): string {
    const control = this.entidadForm.get(nombreCampo);
    if (control && control.errors && control.touched) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['email']) return 'Formato de email inválido';
      if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
      if (control.errors['min']) return `Valor mínimo: ${control.errors['min'].min}`;
      if (control.errors['max']) return `Valor máximo: ${control.errors['max'].max}`;
    }
    return '';
  }

  mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  mostrarError(mensaje: string): void {
    this.errorMsg.set(mensaje);
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Métodos de utilidad
  esCampoRequerido(nombreCampo: string): boolean {
    const control = this.entidadForm.get(nombreCampo);
    return control?.hasError('required') || false;
  }

  esCampoInvalido(nombreCampo: string): boolean {
    const control = this.entidadForm.get(nombreCampo);
    return (control?.invalid && control?.touched) || false;
  }

  // Función de comparación para mat-select con objetos
  compararPorCodigo(obj1: any, obj2: any): boolean {
    return obj1 && obj2 && obj1.codigo === obj2.codigo;
  }

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones activas para evitar memory leaks
    this.subscriptions.unsubscribe();
  }

}
