import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { forkJoin } from 'rxjs';

import { Entidad } from '../../../model/entidad';
import { Participe } from '../../../model/participe';
import { Filial } from '../../../model/filial';
import { TipoIdentificacion } from '../../../model/tipo-identificacion';
import { TipoHidrocarburifica } from '../../../model/tipo-hidrocarburifica';
import { TipoVivienda } from '../../../model/tipo-vivienda';
import { TipoParticipe } from '../../../model/tipo-participe';

import { EntidadService } from '../../../service/entidad.service';
import { ParticipeService } from '../../../service/participe.service';
import { FilialService } from '../../../service/filial.service';
import { TipoIdentificacionService } from '../../../service/tipo-identificacion.service';
import { TipoParticipeService } from '../../../service/tipo-participe.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';

@Component({
  selector: 'app-entidad-participe-info',
  standalone: true,
  imports: [
    CommonModule,
    MaterialFormModule
  ],
  templateUrl: './entidad-participe-info.component.html',
  styleUrl: './entidad-participe-info.component.scss'
})
export class EntidadParticipeInfoComponent implements OnInit {

  // Servicios
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private entidadService = inject(EntidadService);
  private participeService = inject(ParticipeService);
  private filialService = inject(FilialService);
  private tipoIdentificacionService = inject(TipoIdentificacionService);
  private tipoParticipeService = inject(TipoParticipeService);
  private funcionesDatosService = inject(FuncionesDatosService);

  // Signals de estado
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  hasError = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Signals de datos
  codigoEntidad = signal<number | null>(null);
  codigoParticipe = signal<number | null>(null);
  entidadActual = signal<Entidad | null>(null);
  participeActual = signal<Participe | null>(null);

  // Opciones para selects
  filialesOptions = signal<Filial[]>([]);
  tiposIdentificacionOptions = signal<TipoIdentificacion[]>([]);
  tiposParticipeOptions = signal<TipoParticipe[]>([]);

  loadingFiliales = signal<boolean>(false);
  loadingTiposId = signal<boolean>(false);
  loadingTiposParticipe = signal<boolean>(false);

  // Signals para validez de formularios
  entidadFormValid = signal<boolean>(false);
  participeFormValid = signal<boolean>(false);

  // Formularios
  entidadForm!: FormGroup;
  participeForm!: FormGroup;

  // Computeds
  modoEdicion = computed(() => !!this.codigoEntidad() && !!this.codigoParticipe());
  titulo = computed(() => this.modoEdicion() ? 'Editar Información de Partícipe' : 'Nueva Información de Partícipe');

  // Validación combinada de ambos formularios
  isFormValid = computed(() => {
    const entidadValid = this.entidadFormValid();
    const participeValid = this.participeFormValid();
    console.log('🔍 isFormValid computed:', { entidadValid, participeValid });
    return entidadValid && participeValid;
  });

  // Opciones estáticas
  estadosOptions = [
    { value: 0, label: 'Inactivo' },
    { value: 1, label: 'Activo' }
  ];

  sectorPublicoOptions = [
    { value: 0, label: 'No' },
    { value: 1, label: 'Sí' }
  ];

  ngOnInit(): void {
    this.inicializarFormularios();
    this.cargarDatosIniciales();
  }

  private inicializarFormularios(): void {
    // Formulario de Entidad
    this.entidadForm = this.fb.group({
      codigo: [{ value: null, disabled: true }],
      filial: [null as Filial | null, Validators.required],
      tipoIdentificacion: [null as TipoIdentificacion | null, Validators.required],
      numeroIdentificacion: ['', [Validators.required, Validators.maxLength(20)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
      nombreComercial: ['', Validators.maxLength(200)],
      correoPersonal: ['', [Validators.email, Validators.maxLength(100)]],
      correoInstitucional: ['', [Validators.email, Validators.maxLength(100)]],
      telefono: ['', Validators.maxLength(20)],
      movil: ['', Validators.maxLength(20)],
      tieneCorreoPersonal: [0],
      tieneCorreoTrabajo: [0],
      tieneTelefono: [0],
      idCiudad: [''],
      tipoHidrocarburifica: [null as TipoHidrocarburifica | null],
      tipoVivienda: [null as TipoVivienda | null],
      numeroCargasFamiliares: [0, Validators.min(0)],
      sectorPublico: [0],
      porcentajeSimilitud: [0, [Validators.min(0), Validators.max(100)]],
      busqueda: [''],
      fechaNacimiento: [null as Date | null],
      urlFotoLogo: [''],
      idEstado: [1, Validators.required],
      migrado: [0],
      usuarioIngreso: [{ value: '', disabled: true }],
      fechaIngreso: [{ value: null, disabled: true }],
      usuarioModificacion: [{ value: '', disabled: true }],
      fechaModificacion: [{ value: null, disabled: true }],
      ipIngreso: [{ value: '', disabled: true }],
      ipModificacion: [{ value: '', disabled: true }]
    });

    // Formulario de Partícipe
    this.participeForm = this.fb.group({
      codigo: [{ value: null, disabled: true }],
      entidad: [null as Entidad | null], // Se llenará automáticamente
      codigoAlterno: [0],
      tipoParticipe: [null as TipoParticipe | null, Validators.required],
      remuneracionUnificada: [0, [Validators.required, Validators.min(0)]],
      fechaIngresoTrabajo: [null as Date | null],
      lugarTrabajo: ['', Validators.maxLength(200)],
      unidadAdministrativa: ['', Validators.maxLength(200)],
      cargoActual: ['', Validators.maxLength(200)],
      nivelEstudios: ['', Validators.maxLength(100)],
      ingresoAdicionalMensual: [0, Validators.min(0)],
      ingresoAdicionalActividad: ['', Validators.maxLength(200)],
      codigoTipoCalificacion: [0],
      fechaIngresoFondo: [null as Date | null, Validators.required],
      estadoActual: [1],
      fechaFallecimiento: [null as Date | null],
      causaFallecimiento: ['', Validators.maxLength(200)],
      motivoSalida: ['', Validators.maxLength(200)],
      fechaSalida: [null as Date | null],
      estadoCesante: [0],
      fechaIngreso: [{ value: null, disabled: true }],
      idEstado: [1, Validators.required]
    });

    // Suscribirse a cambios de validación de entidadForm
    this.entidadForm.statusChanges.subscribe(() => {
      this.entidadFormValid.set(this.entidadForm.valid);
      console.log('📝 Entidad Form Valid:', this.entidadForm.valid);
    });

    // Suscribirse a cambios de validación de participeForm
    this.participeForm.statusChanges.subscribe(() => {
      this.participeFormValid.set(this.participeForm.valid);
      console.log('📝 Partícipe Form Valid:', this.participeForm.valid);
    });

    // Inicializar estados de validación
    this.entidadFormValid.set(this.entidadForm.valid);
    this.participeFormValid.set(this.participeForm.valid);
  }

  private cargarDatosIniciales(): void {
    this.loading.set(true);

    // Obtener códigos de la ruta
    const codigoEntidadParam = this.route.snapshot.queryParamMap.get('codigoEntidad');
    const codigoParticipeParam = this.route.snapshot.queryParamMap.get('codigoParticipe');

    if (codigoEntidadParam) this.codigoEntidad.set(+codigoEntidadParam);
    if (codigoParticipeParam) this.codigoParticipe.set(+codigoParticipeParam);

    // Cargar opciones de selects
    this.cargarOpcionesSelects();

    // Si es modo edición, cargar datos
    if (this.modoEdicion()) {
      this.cargarDatosEdicion();
    } else {
      this.loading.set(false);
    }
  }

  private cargarOpcionesSelects(): void {
    this.loadingFiliales.set(true);
    this.loadingTiposId.set(true);
    this.loadingTiposParticipe.set(true);

    forkJoin({
      filiales: this.filialService.getAll(),
      tiposIdentificacion: this.tipoIdentificacionService.getAll(),
      tiposParticipe: this.tipoParticipeService.getAll()
    }).subscribe({
      next: (data) => {
        this.filialesOptions.set(data.filiales || []);
        this.tiposIdentificacionOptions.set(data.tiposIdentificacion || []);
        this.tiposParticipeOptions.set(data.tiposParticipe || []);

        this.loadingFiliales.set(false);
        this.loadingTiposId.set(false);
        this.loadingTiposParticipe.set(false);
      },
      error: (err) => {
        console.error('Error al cargar opciones de selects:', err);
        this.hasError.set(true);
        this.errorMsg.set('Error al cargar las opciones. Por favor, recargue la página.');

        this.loadingFiliales.set(false);
        this.loadingTiposId.set(false);
        this.loadingTiposParticipe.set(false);
      }
    });
  }

  private cargarDatosEdicion(): void {
    const codigoEnt = this.codigoEntidad();
    const codigoPart = this.codigoParticipe();

    if (!codigoEnt || !codigoPart) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      entidad: this.entidadService.getById(codigoEnt.toString()),
      participe: this.participeService.getById(codigoPart.toString())
    }).subscribe({
      next: (data) => {
        if (data.entidad) {
          console.log('Cargando datos de entidad en formulario:', data.entidad);
          this.entidadActual.set(data.entidad);
          this.cargarDatosEnFormularioEntidad(data.entidad);
        }

        if (data.participe) {
          console.log('Cargando datos de partícipe en formulario:', data.participe);
          this.participeActual.set(data.participe);
          this.cargarDatosEnFormularioParticipe(data.participe);
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar datos:', err);
        this.hasError.set(true);
        this.errorMsg.set('Error al cargar los datos. Por favor, intente nuevamente.');
        this.loading.set(false);
      }
    });
  }

  private cargarDatosEnFormularioEntidad(entidad: Entidad): void {
    this.entidadForm.patchValue({
      codigo: entidad.codigo,
      filial: entidad.filial,
      tipoIdentificacion: entidad.tipoIdentificacion,
      numeroIdentificacion: entidad.numeroIdentificacion || '',
      razonSocial: entidad.razonSocial || '',
      nombreComercial: entidad.nombreComercial || '',
      correoPersonal: entidad.correoPersonal || '',
      correoInstitucional: entidad.correoInstitucional || '',
      telefono: entidad.telefono || '',
      movil: entidad.movil || '',
      tieneCorreoPersonal: entidad.tieneCorreoPersonal || 0,
      tieneCorreoTrabajo: entidad.tieneCorreoTrabajo || 0,
      tieneTelefono: entidad.tieneTelefono || 0,
      idCiudad: entidad.idCiudad || '',
      tipoHidrocarburifica: entidad.tipoHidrocarburifica,
      tipoVivienda: entidad.tipoVivienda,
      numeroCargasFamiliares: entidad.numeroCargasFamiliares || 0,
      sectorPublico: entidad.sectorPublico || 0,
      porcentajeSimilitud: entidad.porcentajeSimilitud || 0,
      busqueda: entidad.busqueda || '',
      fechaNacimiento: entidad.fechaNacimiento ? new Date(entidad.fechaNacimiento) : null,
      urlFotoLogo: entidad.urlFotoLogo || '',
      idEstado: entidad.idEstado || 1,
      migrado: entidad.migrado || 0,
      usuarioIngreso: entidad.usuarioIngreso || '',
      fechaIngreso: entidad.fechaIngreso ? new Date(entidad.fechaIngreso) : null,
      usuarioModificacion: entidad.usuarioModificacion || '',
      fechaModificacion: entidad.fechaModificacion ? new Date(entidad.fechaModificacion) : null,
      ipIngreso: entidad.ipIngreso || '',
      ipModificacion: entidad.ipModificacion || ''
    });
  }

  private cargarDatosEnFormularioParticipe(participe: Participe): void {
    this.participeForm.patchValue({
      codigo: participe.codigo,
      entidad: participe.entidad,
      codigoAlterno: participe.codigoAlterno || 0,
      tipoParticipe: participe.tipoParticipe,
      remuneracionUnificada: participe.remuneracionUnificada || 0,
      fechaIngresoTrabajo: participe.fechaIngresoTrabajo ? new Date(participe.fechaIngresoTrabajo) : null,
      lugarTrabajo: participe.lugarTrabajo || '',
      unidadAdministrativa: participe.unidadAdministrativa || '',
      cargoActual: participe.cargoActual || '',
      nivelEstudios: participe.nivelEstudios || '',
      ingresoAdicionalMensual: participe.ingresoAdicionalMensual || 0,
      ingresoAdicionalActividad: participe.ingresoAdicionalActividad || '',
      codigoTipoCalificacion: participe.codigoTipoCalificacion || 0,
      fechaIngresoFondo: participe.fechaIngresoFondo ? new Date(participe.fechaIngresoFondo) : null,
      estadoActual: participe.estadoActual || 1,
      fechaFallecimiento: participe.fechaFallecimiento ? new Date(participe.fechaFallecimiento) : null,
      causaFallecimiento: participe.causaFallecimiento || '',
      motivoSalida: participe.motivoSalida || '',
      fechaSalida: participe.fechaSalida ? new Date(participe.fechaSalida) : null,
      estadoCesante: participe.estadoCesante || 0,
      fechaIngreso: participe.fechaIngreso ? new Date(participe.fechaIngreso) : null,
      idEstado: participe.idEstado || 1
    });
  }

  guardar(): void {
    if (!this.isFormValid()) {
      console.warn('Formularios inválidos');
      this.debugFormErrors();
      return;
    }

    this.saving.set(true);

    // Preparar datos de Entidad
    const entidadData = this.prepararDatosEntidad();

    // Guardar/Actualizar Entidad primero
    const entidadObservable = this.modoEdicion()
      ? this.entidadService.update(entidadData)
      : this.entidadService.add(entidadData);

    entidadObservable.subscribe({
      next: (entidadGuardada: Entidad | null) => {
        if (entidadGuardada) {
          // Una vez guardada la entidad, guardar el partícipe
          const participeData = this.prepararDatosParticipe(entidadGuardada);

          const participeObservable = this.modoEdicion()
            ? this.participeService.update(participeData)
            : this.participeService.add(participeData);

          participeObservable.subscribe({
            next: (participeGuardado: Participe | null) => {
              this.saving.set(false);
              console.log('Datos guardados exitosamente');

              // Navegar de vuelta con los códigos guardados
              const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
              if (returnUrl) {
                this.router.navigate([returnUrl], {
                  queryParams: {
                    codigoEntidad: entidadGuardada.codigo,
                    codigoParticipe: participeGuardado?.codigo
                  }
                });
              } else {
                this.router.navigate(['/menucreditos/participe-dash']);
              }
            },
            error: (err: any) => {
              console.error('Error al guardar partícipe:', err);
              this.hasError.set(true);
              this.errorMsg.set('Error al guardar los datos del partícipe');
              this.saving.set(false);
            }
          });
        }
      },
      error: (err: any) => {
        console.error('Error al guardar entidad:', err);
        this.hasError.set(true);
        this.errorMsg.set('Error al guardar los datos de la entidad');
        this.saving.set(false);
      }
    });
  }

  private prepararDatosEntidad(): any {
    const formValue = this.entidadForm.getRawValue();

    // Formatear fechas
    const datosFormateados = this.funcionesDatosService.formatearFechasParaBackend(formValue, [
      { campo: 'fechaNacimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
      { campo: 'fechaIngreso', tipo: TipoFormatoFechaBackend.FECHA_HORA },
      { campo: 'fechaModificacion', tipo: TipoFormatoFechaBackend.FECHA_HORA }
    ]);

    return datosFormateados;
  }

  private prepararDatosParticipe(entidad: Entidad): any {
    const formValue = this.participeForm.getRawValue();

    // Asignar la entidad guardada
    formValue.entidad = entidad;

    // Formatear fechas
    const datosFormateados = this.funcionesDatosService.formatearFechasParaBackend(formValue, [
      { campo: 'fechaIngresoTrabajo', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
      { campo: 'fechaIngresoFondo', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
      { campo: 'fechaFallecimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
      { campo: 'fechaSalida', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
      { campo: 'fechaIngreso', tipo: TipoFormatoFechaBackend.FECHA_HORA }
    ]);

    return datosFormateados;
  }

  // Comparador para selects con objetos
  compararPorCodigo(obj1: any, obj2: any): boolean {
    return obj1 && obj2 && obj1.codigo === obj2.codigo;
  }

  // Validación de campos
  esCampoInvalido(nombreCampo: string, formulario: 'entidad' | 'participe' = 'entidad'): boolean {
    const form = formulario === 'entidad' ? this.entidadForm : this.participeForm;
    const campo = form.get(nombreCampo);
    return !!(campo && campo.invalid && (campo.dirty || campo.touched));
  }

  obtenerErrorCampo(nombreCampo: string, formulario: 'entidad' | 'participe' = 'entidad'): string {
    const form = formulario === 'entidad' ? this.entidadForm : this.participeForm;
    const campo = form.get(nombreCampo);

    if (campo?.hasError('required')) return 'Este campo es requerido';
    if (campo?.hasError('email')) return 'Email inválido';
    if (campo?.hasError('maxlength')) return `Máximo ${campo.errors?.['maxlength'].requiredLength} caracteres`;
    if (campo?.hasError('min')) return `Valor mínimo: ${campo.errors?.['min'].min}`;
    if (campo?.hasError('max')) return `Valor máximo: ${campo.errors?.['max'].max}`;

    return 'Campo inválido';
  }

  debugFormErrors(): void {
    console.group('🔍 Estado de Formularios');
    console.log('Entidad Form Valid:', this.entidadForm.valid);
    console.log('Partícipe Form Valid:', this.participeForm.valid);

    console.group('Errores Entidad:');
    Object.keys(this.entidadForm.controls).forEach(key => {
      const control = this.entidadForm.get(key);
      if (control && control.invalid) {
        console.log(`${key}:`, control.errors);
      }
    });
    console.groupEnd();

    console.group('Errores Partícipe:');
    Object.keys(this.participeForm.controls).forEach(key => {
      const control = this.participeForm.get(key);
      if (control && control.invalid) {
        console.log(`${key}:`, control.errors);
      }
    });
    console.groupEnd();

    console.groupEnd();
  }

  limpiarFormulario(): void {
    this.entidadForm.reset({
      idEstado: 1,
      migrado: 0,
      sectorPublico: 0,
      numeroCargasFamiliares: 0,
      porcentajeSimilitud: 0,
      tieneCorreoPersonal: 0,
      tieneCorreoTrabajo: 0,
      tieneTelefono: 0
    });

    this.participeForm.reset({
      idEstado: 1,
      estadoActual: 1,
      estadoCesante: 0,
      remuneracionUnificada: 0,
      ingresoAdicionalMensual: 0,
      codigoAlterno: 0,
      codigoTipoCalificacion: 0
    });
  }

  regresar(): void {
    // Intentar obtener el returnUrl de los query params
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (returnUrl) {
      // Si hay returnUrl, navegar allí con los códigos
      this.router.navigate([returnUrl], {
        queryParams: {
          codigoEntidad: this.codigoEntidad(),
          codigoParticipe: this.codigoParticipe()
        }
      });
    } else {
      // Por defecto, ir al dashboard de partícipes
      this.router.navigate(['/menucreditos/participe-dash']);
    }
  }
}

