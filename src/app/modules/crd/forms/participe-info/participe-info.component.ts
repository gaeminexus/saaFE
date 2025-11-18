import { Component, OnInit, Input, inject, signal, computed, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { Entidad } from '../../model/entidad';
import { Filial } from '../../model/filial';

import { TipoIdentificacion } from '../../model/tipo-identificacion';
import { EntidadService } from '../../service/entidad.service';
import { FilialService } from '../../service/filial.service';

import { TipoIdentificacionService } from '../../service/tipo-identificacion.service';

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
  selector: 'app-participe-info',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,

    MatDividerModule,
    MatStepperModule,
    MatTooltipModule
  ],
  templateUrl: './participe-info.component.html',
  styleUrl: './participe-info.component.scss'
})
export class ParticipeInfoComponent implements OnInit, OnChanges {

  // Inputs para filtrado y configuración
  @Input() codigoEntidad?: number; // Código específico de entidad a filtrar
  @Input() modoFiltrado: boolean = false; // Si true, carga entidad específica
  @Input() soloLectura: boolean = false; // Si true, formulario en modo solo lectura
  @Input() ocultarBotones: boolean = false; // Si true, oculta botones de acción

  // Servicios
  private fb = inject(FormBuilder);
  private entidadService = inject(EntidadService);
  private filialService = inject(FilialService);

  private tipoIdentificacionService = inject(TipoIdentificacionService);
  private snackBar = inject(MatSnackBar);

  // Señales para estado reactivo
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  errorMsg = signal<string>('');
  modoEdicion = signal<boolean>(false);
  entidadActual = signal<Entidad | null>(null);

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
  isFormValid = computed(() => this.entidadForm?.valid || false);
  formTitle = computed(() => this.modoEdicion() ? 'Editar Entidad' : 'Nueva Entidad');

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarDatosSelect();

    // Si hay código de entidad, cargar la entidad específica
    if (this.modoFiltrado && this.codigoEntidad) {
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
    this.filialService.getAll().subscribe({
      next: (filiales) => {
        this.loadingFiliales.set(false);
        if (filiales && filiales.length > 0) {
          this.filialesOptions = filiales;
          console.log(`✅ ${filiales.length} filiales cargadas`);
        }
      },
      error: (error) => {
        this.loadingFiliales.set(false);
        console.error('❌ Error cargando filiales:', error);
      }
    });



    // Cargar tipos identificación
    this.loadingTiposId.set(true);
    this.tipoIdentificacionService.getAll().subscribe({
      next: (tipos) => {
        this.loadingTiposId.set(false);
        if (tipos && tipos.length > 0) {
          this.tiposIdentificacionOptions = tipos;
          console.log(`✅ ${tipos.length} tipos identificación cargados`);
        }
      },
      error: (error) => {
        this.loadingTiposId.set(false);
        console.error('❌ Error cargando tipos identificación:', error);
      }
    });
  }

  inicializarFormulario(): void {
    this.entidadForm = this.fb.group({
      // Datos básicos
      codigo: [{ value: '', disabled: true }],
      filial: [null],

      TipoIdentificacion: [null],
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
  }

  limpiarFormulario(): void {
    this.entidadForm.reset();
    this.entidadForm.patchValue({
      codigo: '',
      filial: null,

      TipoIdentificacion: null,
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
      filial: entidad.filial?.codigo || null,

      TipoIdentificacion: entidad.TipoIdentificacion?.codigo || null,
      numeroIdentificacion: entidad.numeroIdentificacion,
      razonSocial: entidad.razonSocial,
      nombreComercial: entidad.nombreComercial,
      fechaNacimiento: entidad.fechaNacimiento,
      correoPersonal: entidad.correoPersonal,
      correoInstitucional: entidad.correoInstitucional,
      telefono: entidad.telefono,
      movil: entidad.movil,
      tieneCorreoPersonal: entidad.tieneCorreoPersonal || 0,
      tieneCorreoTrabajo: entidad.tieneCorreoTrabajo || 0,
      tieneTelefono: entidad.tieneTelefono || 0,
      numeroCargasFamiliares: entidad.numeroCargasFamiliares || 0,
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
      fechaModificacion: entidad.fechaModificacion,
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

    // Usar selectByCriteria para filtrar por código
    const criterio = {
      codigo: codigo
    };

    this.entidadService.selectByCriteria(criterio).subscribe({
      next: (entidades) => {
        this.loading.set(false);
        if (entidades && entidades.length > 0) {
          const entidad = entidades[0]; // Tomar la primera (debería ser única por código)
          this.entidadActual.set(entidad);
          this.modoEdicion.set(true);
          this.llenarFormulario(entidad);

          console.log(`✅ Entidad cargada - Código: ${entidad.codigo}, Razón Social: ${entidad.razonSocial}`);

          // Si está en modo solo lectura, deshabilitar formulario
          if (this.soloLectura) {
            this.entidadForm.disable();
          }
        } else {
          this.errorMsg.set(`No se encontró entidad con código: ${codigo}`);
          this.limpiarFormulario();
          console.warn(`⚠️ No se encontró entidad con código: ${codigo}`);
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMsg.set('Error al cargar la entidad');
        console.error('❌ Error cargando entidad por código:', error);

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
    return {
      ...formValue,
      // Convertir checkboxes a números
      tieneCorreoPersonal: formValue.tieneCorreoPersonal ? 1 : 0,
      tieneCorreoTrabajo: formValue.tieneCorreoTrabajo ? 1 : 0,
      tieneTelefono: formValue.tieneTelefono ? 1 : 0,
      sectorPublico: formValue.sectorPublico ? 1 : 0,
      migrado: formValue.migrado ? 1 : 0
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
}
