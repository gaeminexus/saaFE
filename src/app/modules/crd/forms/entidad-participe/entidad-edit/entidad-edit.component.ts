import { Component, OnInit, Input, inject, signal, computed, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Entidad } from '../../../model/entidad';
import { Filial } from '../../../model/filial';
import { Participe } from '../../../model/participe';
import { TipoIdentificacion } from '../../../model/tipo-identificacion';
import { TipoHidrocarburifica } from '../../../model/tipo-hidrocarburifica';
import { TipoParticipe } from '../../../model/tipo-participe';
import { TipoVivienda } from '../../../model/tipo-vivienda';
import { EntidadService } from '../../../service/entidad.service';
import { FilialService } from '../../../service/filial.service';
import { ParticipeService } from '../../../service/participe.service';
import { TipoIdentificacionService } from '../../../service/tipo-identificacion.service';
import { TipoParticipeService } from '../../../service/tipo-participe.service';
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
  private participeService = inject(ParticipeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private tipoIdentificacionService = inject(TipoIdentificacionService);
  private tipoParticipeService = inject(TipoParticipeService);
  private snackBar = inject(MatSnackBar);
  private funcionesDatosService = inject(FuncionesDatosService);

  // Señales para estado reactivo
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  errorMsg = signal<string>('');
  modoEdicion = signal<boolean>(false);
  entidadActual = signal<Entidad | null>(null);
  participeActual = signal<Participe | null>(null);
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
  tiposParticipeOptions: TipoParticipe[] = [];
  loadingFiliales = signal<boolean>(false);

  loadingTiposId = signal<boolean>(false);
  loadingTiposParticipe = signal<boolean>(false);

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
    }

    this.cargarDatosSelect();

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

    // Cargar tipos de partícipe
    this.loadingTiposParticipe.set(true);
    const tipoPartSub = this.tipoParticipeService.getAll().subscribe({
      next: (tipos) => {
        this.loadingTiposParticipe.set(false);
        if (tipos && tipos.length > 0) {
          this.tiposParticipeOptions = tipos;
        }
      },
      error: () => {
        this.loadingTiposParticipe.set(false);
      }
    });
    this.subscriptions.add(tipoPartSub);
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

      // Tabla Partícipe (PRTC)
      codigoParticipe: [{ value: null, disabled: true }],
      tipoParticipe: [null as TipoParticipe | null, [Validators.required]],
      codigoAlterno: [0],
      remuneracionUnificada: [0, [Validators.min(0)]],
      fechaIngresoTrabajo: [null],
      lugarTrabajo: ['', [Validators.maxLength(200)]],
      unidadAdministrativa: ['', [Validators.maxLength(200)]],
      cargoActual: ['', [Validators.maxLength(200)]],
      nivelEstudios: ['', [Validators.maxLength(100)]],
      ingresoAdicionalMensual: [0, [Validators.min(0)]],
      ingresoAdicionalActividad: ['', [Validators.maxLength(200)]],
      tipoCalificacion: [0],
      fechaIngresoFondo: [null, [Validators.required]],
      estadoActual: [1],
      fechaFallecimiento: [null],
      causaFallecimiento: ['', [Validators.maxLength(200)]],
      motivoSalida: ['', [Validators.maxLength(200)]],
      fechaSalida: [null],
      estadoCesante: [0],
      idEstadoParticipe: [1],

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
      porcentajeSimilitud: 0,
      codigoParticipe: null,
      tipoParticipe: null,
      codigoAlterno: 0,
      remuneracionUnificada: 0,
      ingresoAdicionalMensual: 0,
      tipoCalificacion: 0,
      estadoActual: 1,
      estadoCesante: 0,
      idEstadoParticipe: 1
    });
    this.modoEdicion.set(false);
    this.entidadActual.set(null);
    this.participeActual.set(null);
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
          this.cargarParticipePorEntidad(entidad.codigo);
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
      fechaNacimiento: this.convertirFecha(entidad.fechaNacimiento) || (entidad.fechaNacimiento ? new Date(entidad.fechaNacimiento) : null),
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
      fechaIngreso: this.convertirFecha(entidad.fechaIngreso) || entidad.fechaIngreso,
      usuarioModificacion: entidad.usuarioModificacion,
      ipIngreso: entidad.ipIngreso,
      ipModificacion: entidad.ipModificacion
    });
  }

  private cargarParticipePorEntidad(codigoEntidad: number): void {
    const criterios: DatosBusqueda[] = [];

    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      String(codigoEntidad),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEntidad);

    const order = new DatosBusqueda();
    order.orderBy('codigo');
    order.setTipoOrden(DatosBusqueda.ORDER_DESC);
    criterios.push(order);

    const partSub = this.participeService.selectByCriteria(criterios).subscribe({
      next: (participes) => {
        const participe = (participes ?? [])[0] ?? null;
        this.participeActual.set(participe);

        if (participe) {
          this.entidadForm.patchValue({
            codigoParticipe: participe.codigo,
            tipoParticipe: participe.tipoParticipe || null,
            codigoAlterno: participe.codigoAlterno || 0,
            remuneracionUnificada: participe.remuneracionUnificada || 0,
            fechaIngresoTrabajo: this.convertirFecha(participe.fechaIngresoTrabajo),
            lugarTrabajo: participe.lugarTrabajo || '',
            unidadAdministrativa: participe.unidadAdministrativa || '',
            cargoActual: participe.cargoActual || '',
            nivelEstudios: participe.nivelEstudios || '',
            ingresoAdicionalMensual: participe.ingresoAdicionalMensual || 0,
            ingresoAdicionalActividad: participe.ingresoAdicionalActividad || '',
            tipoCalificacion: participe.tipoCalificacion || 0,
            fechaIngresoFondo: this.convertirFecha(participe.fechaIngresoFondo),
            estadoActual: participe.estadoActual || 1,
            fechaFallecimiento: this.convertirFecha(participe.fechaFallecimiento),
            causaFallecimiento: participe.causaFallecimiento || '',
            motivoSalida: participe.motivoSalida || '',
            fechaSalida: this.convertirFecha(participe.fechaSalida),
            estadoCesante: participe.estadoCesante || 0,
            idEstadoParticipe: participe.idEstado || 1,
          });
        }
      },
      error: () => {
        this.participeActual.set(null);
      }
    });

    this.subscriptions.add(partSub);
  }

  guardar(): void {
    if (this.entidadForm.valid) {
      this.saving.set(true);
      this.errorMsg.set('');

      const formValue = this.entidadForm.getRawValue();
      const entidadData = this.prepararDatosEntidad(formValue);

      const operacionEntidad = this.modoEdicion()
        ? this.entidadService.update(entidadData)
        : this.entidadService.add(entidadData);

      operacionEntidad.subscribe({
        next: (entidadGuardada) => {
          if (!entidadGuardada) {
            this.saving.set(false);
            this.mostrarError('No se pudo guardar la entidad');
            return;
          }

          const participeData = this.prepararDatosParticipe(formValue, entidadGuardada);
          const codigoParticipe = this.participeActual()?.codigo;

          const operacionParticipe = codigoParticipe
            ? this.participeService.update({ ...participeData, codigo: codigoParticipe })
            : this.participeService.add(participeData);

          operacionParticipe.subscribe({
            next: (participeGuardado) => {
              this.saving.set(false);
              this.entidadActual.set(entidadGuardada);
              this.participeActual.set(participeGuardado || null);
              this.mostrarExito(this.modoEdicion() ? 'Entidad y partícipe actualizados exitosamente' : 'Entidad y partícipe creados exitosamente');

              if (!this.modoEdicion()) {
                this.limpiarFormulario();
                return;
              }

              this.llenarFormulario(entidadGuardada);
              this.cargarParticipePorEntidad(entidadGuardada.codigo);
            },
            error: (error) => {
              this.saving.set(false);
              this.mostrarError(`Error al guardar partícipe: ${error?.message || 'Error desconocido'}`);
            },
          });
        },
        error: (error) => {
          this.saving.set(false);
          this.mostrarError(`Error al guardar entidad: ${error?.message || 'Error desconocido'}`);
        },
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
          this.cargarParticipePorEntidad(entidad.codigo);

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

  prepararDatosEntidad(formValue: any): Partial<Entidad> {
    const datos: Partial<Entidad> = {
      ...formValue,
      filial: formValue.filial || undefined,
      tipoHidrocarburifica: formValue.tipoHidrocarburifica || undefined,
      tipoIdentificacion: formValue.tipoIdentificacion || undefined,
      tipoVivienda: formValue.tipoVivienda || undefined,
      fechaNacimiento: this.funcionesDatosService.formatearFechaParaBackend(formValue.fechaNacimiento) as any,
      cargasFamiliares: Number(formValue.numeroCargasFamiliares || 0),
      tieneCorreoPersonal: formValue.tieneCorreoPersonal ? 1 : 0,
      tieneCorreoTrabajo: formValue.tieneCorreoTrabajo ? 1 : 0,
      tieneTelefono: formValue.tieneTelefono ? 1 : 0,
      sectorPublico: formValue.sectorPublico ? 1 : 0,
      migrado: formValue.migrado ? 1 : 0
    };

    delete (datos as any).codigoParticipe;
    delete (datos as any).tipoParticipe;
    delete (datos as any).codigoAlterno;
    delete (datos as any).remuneracionUnificada;
    delete (datos as any).fechaIngresoTrabajo;
    delete (datos as any).lugarTrabajo;
    delete (datos as any).unidadAdministrativa;
    delete (datos as any).cargoActual;
    delete (datos as any).nivelEstudios;
    delete (datos as any).ingresoAdicionalMensual;
    delete (datos as any).ingresoAdicionalActividad;
    delete (datos as any).tipoCalificacion;
    delete (datos as any).fechaIngresoFondo;
    delete (datos as any).estadoActual;
    delete (datos as any).fechaFallecimiento;
    delete (datos as any).causaFallecimiento;
    delete (datos as any).motivoSalida;
    delete (datos as any).fechaSalida;
    delete (datos as any).estadoCesante;
    delete (datos as any).idEstadoParticipe;

    // No enviar campos de metadata disabled al backend (los maneja automáticamente)
    delete (datos as any).usuarioIngreso;
    delete (datos as any).fechaIngreso;
    delete (datos as any).usuarioModificacion;
    delete (datos as any).fechaModificacion;
    delete (datos as any).ipIngreso;
    delete (datos as any).ipModificacion;

    return datos;
  }

  prepararDatosParticipe(formValue: any, entidadGuardada: Entidad): Partial<Participe> {
    return {
      codigo: this.participeActual()?.codigo as any,
      entidad: entidadGuardada,
      codigoAlterno: Number(formValue.codigoAlterno || 0),
      tipoParticipe: formValue.tipoParticipe || undefined,
      remuneracionUnificada: Number(formValue.remuneracionUnificada || 0),
      fechaIngresoTrabajo: this.funcionesDatosService.formatearFechaParaBackend(formValue.fechaIngresoTrabajo) as any,
      lugarTrabajo: formValue.lugarTrabajo || '',
      unidadAdministrativa: formValue.unidadAdministrativa || '',
      cargoActual: formValue.cargoActual || '',
      nivelEstudios: formValue.nivelEstudios || '',
      ingresoAdicionalMensual: Number(formValue.ingresoAdicionalMensual || 0),
      ingresoAdicionalActividad: formValue.ingresoAdicionalActividad || '',
      tipoCalificacion: Number(formValue.tipoCalificacion || 0),
      fechaIngresoFondo: this.funcionesDatosService.formatearFechaParaBackend(formValue.fechaIngresoFondo) as any,
      estadoActual: Number(formValue.estadoActual || 1),
      fechaFallecimiento: this.funcionesDatosService.formatearFechaParaBackend(formValue.fechaFallecimiento) as any,
      causaFallecimiento: formValue.causaFallecimiento || '',
      motivoSalida: formValue.motivoSalida || '',
      fechaSalida: this.funcionesDatosService.formatearFechaParaBackend(formValue.fechaSalida) as any,
      estadoCesante: Number(formValue.estadoCesante || 0),
      idEstado: Number(formValue.idEstadoParticipe || 1),
    };
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

  /**
   * Convierte una fecha de forma segura manejando diferentes formatos
   */
  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;

    if (fecha instanceof Date) return fecha;

    // Si es un array (como [2023,7,31,0,0]), convertir a Date
    if (Array.isArray(fecha)) {
      // Array format: [year, month, day, hour, minute, second?, millisecond?]
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = fecha;
      // Convertir nanosegundos a milisegundos
      const ms = Math.floor(nanoseconds / 1000000);
      // Nota: los meses en JavaScript Date van de 0-11, pero el backend envía 1-12
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }

    if (typeof fecha === 'string') {
      // Limpiar el string de fecha quitando el timezone [UTC] si existe
      const fechaLimpia = fecha.replace(/\[.*?\]/, '');
      const fechaConvertida = new Date(fechaLimpia);

      // Verificar si la fecha es válida
      if (!isNaN(fechaConvertida.getTime())) {
        return fechaConvertida;
      }
    }

    if (typeof fecha === 'number') {
      return new Date(fecha);
    }

    return null;
  }

}
