import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Empleado } from '../../../model/empleado';
import {
  EstadoPermisoLicencia,
  ModalidadPermiso,
  PermisoLicencia,
  TipoPermiso,
} from '../../../model/permiso-licencia';
import { EmpleadoService } from '../../../service/empleado.service';
import { PermisoLicenciaService } from '../../../service/permiso-licencia.service';
import { TipoPermisoService } from '../../../service/tipo-permiso.service';

export interface PermisosLicenciasFormData {
  mode: 'new' | 'edit' | 'view';
  data?: PermisoLicencia | null;
}

@Component({
  selector: 'app-permisos-licencias-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, MatSlideToggleModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './permisos-licencias-form.component.html',
  styleUrls: ['./permisos-licencias-form.component.scss'],
})
export class PermisosLicenciasFormComponent implements OnInit {
  // Signals de formulario
  formEmpleado = signal<Empleado | null>(null);
  formTipoPermiso = signal<TipoPermiso | null>(null);
  formFechaInicio = signal<Date | null>(null);
  formFechaFin = signal<Date | null>(null);
  formHoraInicio = signal<string>('');
  formHoraFin = signal<string>('');
  formConGoce = signal<boolean>(true);
  formNumeroDocumento = signal<string>('');
  formObservacion = signal<string>('');

  // Datos calculados
  formDias = computed(() => {
    const inicio = this.formFechaInicio();
    const fin = this.formFechaFin();
    if (!inicio || !fin || this.formTipoPermiso()?.modalidad !== 'D') return null;

    const diffTime = fin.getTime() - inicio.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir primer día
    return diffDays > 0 ? diffDays : null;
  });

  formHoras = computed(() => {
    const inicio = this.formHoraInicio();
    const fin = this.formHoraFin();
    if (!inicio || !fin || this.formTipoPermiso()?.modalidad !== 'H') return null;

    const [horaInicio, minInicio] = inicio.split(':').map(Number);
    const [horaFin, minFin] = fin.split(':').map(Number);

    const minutosInicio = horaInicio * 60 + minInicio;
    const minutosFin = horaFin * 60 + minFin;

    const diffMinutos = minutosFin - minutosInicio;
    return diffMinutos > 0 ? Math.round((diffMinutos / 60) * 100) / 100 : null; // Redondear a 2 decimales
  });

  // Listas para combos
  empleados = signal<Empleado[]>([]);
  tiposPermiso = signal<TipoPermiso[]>([]);
  empleadosFiltrados: Observable<Empleado[]>;

  // Control de formulario
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  isReadonly = computed(() => this.formData.mode === 'view');

  // Validaciones en tiempo real
  empleadoRequerido = computed(() => !this.formEmpleado() && !this.isReadonly());
  tipoPermisoRequerido = computed(() => !this.formTipoPermiso() && !this.isReadonly());
  fechaInicioRequerida = computed(() => !this.formFechaInicio() && !this.isReadonly());

  fechaFinRequerida = computed(() => {
    if (this.isReadonly()) return false;
    const tipo = this.formTipoPermiso();
    return tipo?.modalidad === 'D' && !this.formFechaFin();
  });

  horasRequeridas = computed(() => {
    if (this.isReadonly()) return false;
    const tipo = this.formTipoPermiso();
    return tipo?.modalidad === 'H' && (!this.formHoraInicio() || !this.formHoraFin());
  });

  documentoRequerido = computed(() => {
    if (this.isReadonly()) return false;
    const tipo = this.formTipoPermiso();
    return tipo?.requiereDocumento && !this.formNumeroDocumento().trim();
  });

  esRetroactivo = computed(() => {
    const fechaInicio = this.formFechaInicio();
    if (!fechaInicio) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaInicio < hoy;
  });

  observacionRequerida = computed(() => {
    if (this.isReadonly()) return false;
    return this.esRetroactivo() && !this.formObservacion().trim();
  });

  constructor(
    private dialogRef: MatDialogRef<PermisosLicenciasFormComponent>,
    @Inject(MAT_DIALOG_DATA) public formData: PermisosLicenciasFormData,
    private permisoLicenciaService: PermisoLicenciaService,
    private tipoPermisoService: TipoPermisoService,
    private empleadoService: EmpleadoService,
    private snackBar: MatSnackBar,
  ) {
    // Configurar filtrado de empleados
    this.empleadosFiltrados = new Observable(); // Se configurará en ngOnInit
  }

  ngOnInit(): void {
    this.cargarEmpleados();
    this.cargarTiposPermiso();

    if (this.formData.data) {
      this.cargarDatos(this.formData.data);
    }
  }

  private cargarEmpleados(): void {
    // Cargar solo empleados activos usando selectByCriteria
    const criterios: DatosBusqueda[] = [];
    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'estado',
      'A',
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEstado);

    this.empleadoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.empleados.set(data || []);
      },
      error: () => {
        this.empleados.set([]);
      },
    });
  }

  private cargarTiposPermiso(): void {
    // Cargar tipos de permiso activos usando selectByCriteria
    const criterios: DatosBusqueda[] = [];
    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'estado',
      'A',
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEstado);

    this.tipoPermisoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const tipos = data || [];
        this.tiposPermiso.set(tipos.length > 0 ? tipos : this.buildExampleTiposPermiso());
      },
      error: () => {
        this.tiposPermiso.set(this.buildExampleTiposPermiso());
      },
    });
  }

  private buildExampleTiposPermiso(): TipoPermiso[] {
    const now = new Date();
    return [
      {
        codigo: 1,
        nombre: 'Vacaciones',
        modalidad: ModalidadPermiso.DIAS,
        requiereDocumento: false,
        conGocePorDefecto: true,
        estado: 'A',
        fechaRegistro: now,
        usuarioRegistro: 'demo',
      },
      {
        codigo: 2,
        nombre: 'Permiso medico',
        modalidad: ModalidadPermiso.DIAS,
        requiereDocumento: true,
        conGocePorDefecto: true,
        estado: 'A',
        fechaRegistro: now,
        usuarioRegistro: 'demo',
      },
      {
        codigo: 3,
        nombre: 'Permiso personal',
        modalidad: ModalidadPermiso.HORAS,
        requiereDocumento: false,
        conGocePorDefecto: false,
        estado: 'A',
        fechaRegistro: now,
        usuarioRegistro: 'demo',
      },
      {
        codigo: 4,
        nombre: 'Licencia maternidad',
        modalidad: ModalidadPermiso.DIAS,
        requiereDocumento: true,
        conGocePorDefecto: true,
        estado: 'A',
        fechaRegistro: now,
        usuarioRegistro: 'demo',
      },
    ];
  }

  private cargarDatos(permiso: PermisoLicencia): void {
    this.formEmpleado.set(permiso.empleado);
    this.formTipoPermiso.set(permiso.tipoPermiso);
    this.formFechaInicio.set(new Date(permiso.fechaInicio));

    if (permiso.fechaFin) {
      this.formFechaFin.set(new Date(permiso.fechaFin));
    }

    this.formHoraInicio.set(permiso.horaInicio || '');
    this.formHoraFin.set(permiso.horaFin || '');
    this.formConGoce.set(permiso.conGoce);
    this.formNumeroDocumento.set(permiso.numeroDocumento || '');
    this.formObservacion.set(permiso.observacion || '');
  }

  onTipoPermisoChange(tipo: TipoPermiso | null): void {
    this.formTipoPermiso.set(tipo);

    if (tipo) {
      // Aplicar valor por defecto de goce
      this.formConGoce.set(tipo.conGocePorDefecto);

      // Limpiar campos según modalidad
      if (tipo.modalidad === ModalidadPermiso.DIAS) {
        this.formHoraInicio.set('');
        this.formHoraFin.set('');
      } else if (tipo.modalidad === ModalidadPermiso.HORAS) {
        this.formFechaFin.set(null);
      }
    }
  }

  onCancelar(): void {
    this.dialogRef.close(false);
  }

  async onGuardar(): Promise<void> {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    try {
      // Validar solapamientos
      await this.validarSolapamientos();

      const datos = this.buildRequestData();

      let observable: Observable<PermisoLicencia | null>;

      if (this.formData.mode === 'new') {
        observable = this.permisoLicenciaService.add(datos);
      } else {
        observable = this.permisoLicenciaService.update(datos);
      }

      observable.subscribe({
        next: (result) => {
          this.loading.set(false);
          if (result) {
            this.showSuccess(
              this.formData.mode === 'new'
                ? 'Permiso creado exitosamente'
                : 'Permiso actualizado exitosamente',
            );
            this.dialogRef.close(true);
          } else {
            this.errorMsg.set('No se pudo procesar la solicitud');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set(this.extractError(err) || 'Error al guardar el permiso');
        },
      });
    } catch (error) {
      this.loading.set(false);
      if (typeof error === 'string') {
        this.errorMsg.set(error);
      }
    }
  }

  private validarFormulario(): boolean {
    // Limpiar error anterior
    this.errorMsg.set('');

    // Validaciones básicas
    if (!this.formEmpleado()) {
      this.errorMsg.set('Debe seleccionar un empleado');
      return false;
    }

    if (!this.formTipoPermiso()) {
      this.errorMsg.set('Debe seleccionar un tipo de permiso');
      return false;
    }

    if (!this.formFechaInicio()) {
      this.errorMsg.set('La fecha de inicio es obligatoria');
      return false;
    }

    const tipo = this.formTipoPermiso()!;

    // Validaciones según modalidad
    if (tipo.modalidad === ModalidadPermiso.DIAS) {
      if (!this.formFechaFin()) {
        this.errorMsg.set('La fecha de fin es obligatoria para permisos por días');
        return false;
      }

      if (this.formFechaFin()! < this.formFechaInicio()!) {
        this.errorMsg.set('La fecha de fin debe ser mayor o igual a la fecha de inicio');
        return false;
      }

      if ((this.formDias() || 0) <= 0) {
        this.errorMsg.set('Los días calculados deben ser mayores a cero');
        return false;
      }
    } else if (tipo.modalidad === ModalidadPermiso.HORAS) {
      if (!this.formHoraInicio() || !this.formHoraFin()) {
        this.errorMsg.set('Las horas de inicio y fin son obligatorias para permisos por horas');
        return false;
      }

      if (this.formHoraFin() <= this.formHoraInicio()) {
        this.errorMsg.set('La hora de fin debe ser mayor a la hora de inicio');
        return false;
      }

      if ((this.formHoras() || 0) <= 0) {
        this.errorMsg.set('Las horas calculadas deben ser mayores a cero');
        return false;
      }
    }

    // Documento requerido
    if (tipo.requiereDocumento && !this.formNumeroDocumento().trim()) {
      this.errorMsg.set('El número de documento es obligatorio para este tipo de permiso');
      return false;
    }

    // Observación requerida para casos retroactivos
    if (this.esRetroactivo() && !this.formObservacion().trim()) {
      this.errorMsg.set('La observación es obligatoria para solicitudes retroactivas');
      return false;
    }

    return true;
  }

  private async validarSolapamientos(): Promise<void> {
    const empleado = this.formEmpleado()!;
    const fechaInicio = this.formFechaInicio()!;
    const fechaFin = this.formFechaFin();
    const tipo = this.formTipoPermiso()!;

    const datosValidacion = {
      empleadoCodigo: empleado.codigo,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin?.toISOString() || fechaInicio.toISOString(),
      modalidad: tipo.modalidad,
      permisoCodigoExcluir: this.formData.data?.codigo || null,
    };

    return new Promise((resolve, reject) => {
      this.permisoLicenciaService.validarSolapamientos(datosValidacion).subscribe({
        next: (result) => {
          if (result?.tieneSolapamiento) {
            reject(
              `Existe un solapamiento con: ${result.detallesSolapamiento || 'Otro permiso o vacación'}`,
            );
          } else {
            resolve();
          }
        },
        error: (err) => {
          // Si el servicio de validación falla, continuar con advertencia
          console.warn('No se pudo validar solapamientos:', err);
          resolve();
        },
      });
    });
  }

  private buildRequestData(): any {
    const empleado = this.formEmpleado()!;
    const tipo = this.formTipoPermiso()!;
    const fechaInicio = this.formFechaInicio()!;

    const datos: any = {
      empleado: { codigo: empleado.codigo },
      tipoPermiso: { codigo: tipo.codigo },
      fechaInicio: fechaInicio.toISOString(),
      conGoce: this.formConGoce(),
      observacion: this.formObservacion().trim() || null,
      numeroDocumento: this.formNumeroDocumento().trim() || null,
      estado: EstadoPermisoLicencia.PENDIENTE,
    };

    if (this.formData.mode === 'edit' && this.formData.data) {
      datos.codigo = this.formData.data.codigo;
    }

    if (tipo.modalidad === ModalidadPermiso.DIAS) {
      datos.fechaFin = this.formFechaFin()!.toISOString();
      datos.dias = this.formDias();
      datos.horaInicio = null;
      datos.horaFin = null;
      datos.horas = null;
    } else if (tipo.modalidad === ModalidadPermiso.HORAS) {
      datos.fechaFin = fechaInicio.toISOString(); // Mismo día
      datos.horaInicio = this.formHoraInicio();
      datos.horaFin = this.formHoraFin();
      datos.horas = this.formHoras();
      datos.dias = null;
    }

    return datos;
  }

  formatEmpleado(empleado: Empleado): string {
    return `${empleado.identificacion} - ${empleado.apellidos} ${empleado.nombres}`;
  }

  private extractError(error: any): string | null {
    if (typeof error === 'string') {
      return error;
    }
    if (error?.message) {
      return error.message;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    return null;
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }

  getTitle(): string {
    switch (this.formData.mode) {
      case 'new':
        return 'Crear Nuevo Permiso/Licencia';
      case 'edit':
        return 'Editar Permiso/Licencia';
      case 'view':
        return 'Ver Permiso/Licencia';
      default:
        return 'Permiso/Licencia';
    }
  }

  getModalidadDescripcion(): string {
    const tipo = this.formTipoPermiso();
    if (!tipo) return '';

    if (tipo.modalidad === ModalidadPermiso.DIAS) {
      return 'Permiso por días completos';
    } else if (tipo.modalidad === ModalidadPermiso.HORAS) {
      return 'Permiso por horas del día';
    }
    return '';
  }

  getEstadoColor(estado: number): string {
    const estadoOptions = [
      { value: 1, label: 'Pendiente', color: 'warn' },
      { value: 2, label: 'Aprobado', color: 'primary' },
      { value: 3, label: 'Rechazado', color: 'accent' },
      { value: 4, label: 'Cancelado', color: 'basic' },
    ];
    const opt = estadoOptions.find((o) => o.value === estado);
    return opt?.color || 'basic';
  }

  getEstadoLabel(estado: number): string {
    const estadoOptions = [
      { value: 1, label: 'Pendiente' },
      { value: 2, label: 'Aprobado' },
      { value: 3, label: 'Rechazado' },
      { value: 4, label: 'Cancelado' },
    ];
    const opt = estadoOptions.find((o) => o.value === estado);
    return opt?.label || 'Desconocido';
  }
}
