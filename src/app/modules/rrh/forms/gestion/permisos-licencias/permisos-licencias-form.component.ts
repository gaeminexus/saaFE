import { CommonModule } from '@angular/common';
import { Component, ElementRef, computed, Inject, OnInit, signal, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { Empleado } from '../../../model/empleado';
import { PermisoLicencia, TipoPermiso } from '../../../model/permiso-licencia';
import { EmpleadoService } from '../../../service/empleado.service';
import { PermisoLicenciaService } from '../../../service/permiso-licencia.service';
import { CatalogoService } from '../../../service/catalogo.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';

export interface PermisosLicenciasFormData {
  mode: 'new' | 'edit' | 'view';
  data?: PermisoLicencia | null;
}

@Component({
  selector: 'app-permisos-licencias-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, MatSlideToggleModule],
  templateUrl: './permisos-licencias-form.component.html',
  styleUrls: ['./permisos-licencias-form.component.scss'],
})
export class PermisosLicenciasFormComponent implements OnInit {
  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;

  private _rawFechaInicio = '';
  private _rawFechaFin = '';

  // Signals de formulario
  formEmpleado = signal<Empleado | null>(null);
  formTipoPermiso = signal<TipoPermiso | null>(null);
  /**
   * Fuente de verdad para toda la lógica de negocio (computeds, validación, payload).
   * El FormControl de abajo solo existe para que el datepicker de Material funcione;
   * se mantiene sincronizado manualmente en cada punto donde se asigna una fecha.
   */
  formFechaInicio = signal<Date | null>(null);
  formFechaFin = signal<Date | null>(null);
  formFechaInicioControl = new UntypedFormControl(null);
  formFechaFinControl = new UntypedFormControl(null);
  formHoraInicio = signal<string>('');
  formHoraFin = signal<string>('');
  formConGoce = signal<boolean>(true);
  formNumeroDocumento = signal<string>('');
  formObservacion = signal<string>('');

  // Datos calculados
  formDias = computed(() => {
    const inicio = this.formFechaInicio();
    const fin = this.formFechaFin();
    if (!inicio || !fin) return null;

    const diffTime = fin.getTime() - inicio.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir primer día
    return diffDays > 0 ? diffDays : null;
  });

  formHoras = computed(() => {
    const inicio = this.formHoraInicio();
    const fin = this.formHoraFin();
    if (!inicio || !fin) return null;

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

  fechaFinRequerida = computed(() => !this.formFechaFin() && !this.isReadonly());

  /**
   * Las horas son opcionales: un permiso puede ser de días completos. Solo se exige la pareja
   * completa cuando el usuario ya llenó una de las dos.
   */
  horasRequeridas = computed(() => {
    if (this.isReadonly()) return false;
    const inicio = this.formHoraInicio();
    const fin = this.formHoraFin();
    return (!!inicio || !!fin) && (!inicio || !fin);
  });

  esRetroactivo = computed(() => {
    const fechaInicio = this.formFechaInicio();
    if (!fechaInicio) return false;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Resetear tiempo para comparar solo fechas

    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);

    return inicio < hoy;
  });

  observacionRequerida = computed(() => {
    if (this.isReadonly()) return false;
    return this.esRetroactivo() && !this.formObservacion().trim();
  });

  documentoRequerido = computed(() => {
    if (this.isReadonly()) return false;
    const tipo = this.formTipoPermiso();
    return tipo?.requiereDocumento === 'S' && !this.formNumeroDocumento().trim();
  });

  constructor(
    private dialogRef: MatDialogRef<PermisosLicenciasFormComponent>,
    @Inject(MAT_DIALOG_DATA) public formData: PermisosLicenciasFormData,
    private permisoLicenciaService: PermisoLicenciaService,
    private catalogoService: CatalogoService,
    private empleadoService: EmpleadoService,
    private snackBar: MatSnackBar,
    private funcionesDatosS: FuncionesDatosService,
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

    if (this.isReadonly()) {
      this.formFechaInicioControl.disable();
      this.formFechaFinControl.disable();
    }
  }

  private cargarEmpleados(): void {
    // Empleados activos de la empresa; RHH.MPLD lleva PJRQCDGO desde el script 05
    const criterios: DatosBusqueda[] = criteriosPorEmpresa('apellidos');
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
    // Tipos de permiso activos de la empresa; RHH.CTLG lleva PJRQCDGO desde el script 05
    const criterios: DatosBusqueda[] = criteriosPorEmpresa('nombre');
    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'estado',
      'A',
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEstado);

    this.catalogoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.tiposPermiso.set(data ?? []);
      },
      error: () => {
        this.tiposPermiso.set([]);
      },
    });
  }

  private cargarDatos(permiso: PermisoLicencia): void {
    this.formEmpleado.set(permiso.empleado);
    this.formTipoPermiso.set(permiso.tipoPermiso);
    const inicio = new Date(permiso.fechaInicio);
    this.formFechaInicio.set(inicio);
    this.formFechaInicioControl.setValue(inicio, { emitEvent: false });

    if (permiso.fechaFin) {
      const fin = new Date(permiso.fechaFin);
      this.formFechaFin.set(fin);
      this.formFechaFinControl.setValue(fin, { emitEvent: false });
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
      // El goce de sueldo es un atributo del tipo de permiso (RHH.CTLG)
      this.formConGoce.set(tipo.conGoce === 'S');
    }
  }

  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }

  syncFechaInicioFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        this.aplicarFechaInicio(date);
      }
    }
  }

  onFechaInicioPickerChange(date: Date | null | undefined): void {
    this.aplicarFechaInicio(date || new Date());
  }

  private aplicarFechaInicio(date: Date): void {
    this.formFechaInicio.set(date);
    this.formFechaInicioControl.setValue(date, { emitEvent: false });
    const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaFinRaw(event: Event): void {
    this._rawFechaFin = (event.target as HTMLInputElement).value;
  }

  syncFechaFinFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaFin || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaFin = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        this.aplicarFechaFin(date);
      }
    }
  }

  onFechaFinPickerChange(date: Date | null | undefined): void {
    this.aplicarFechaFin(date || new Date());
  }

  private aplicarFechaFin(date: Date): void {
    this.formFechaFin.set(date);
    this.formFechaFinControl.setValue(date, { emitEvent: false });
    const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
    });
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

    // Validar observación en solicitudes retroactivas
    if (this.esRetroactivo() && !this.formObservacion().trim()) {
      this.errorMsg.set('La observación es obligatoria para solicitudes retroactivas');
      return false;
    }

    const tipo = this.formTipoPermiso()!;

    // Validar documento si es requerido
    if (tipo.requiereDocumento === 'S' && !this.formNumeroDocumento().trim()) {
      this.errorMsg.set('El número de documento es obligatorio para este tipo de permiso');
      return false;
    }

    // Rango de fechas: siempre obligatorio
    if (!this.formFechaFin()) {
      this.errorMsg.set('La fecha de fin es obligatoria');
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

    // Horas: opcionales, pero si se informa una hay que informar la otra
    const horaInicio = this.formHoraInicio();
    const horaFin = this.formHoraFin();

    if ((!!horaInicio || !!horaFin) && (!horaInicio || !horaFin)) {
      this.errorMsg.set('Debe informar la hora de inicio y la hora de fin, o ninguna de las dos');
      return false;
    }

    if (horaInicio && horaFin) {
      if (horaFin <= horaInicio) {
        this.errorMsg.set('La hora de fin debe ser mayor a la hora de inicio');
        return false;
      }

      if ((this.formHoras() || 0) <= 0) {
        this.errorMsg.set('Las horas calculadas deben ser mayores a cero');
        return false;
      }
    }

    return true;
  }

  private buildRequestData(): any {
    const empleado = this.formEmpleado()!;
    const tipo = this.formTipoPermiso()!;
    const fechaInicio = this.formFechaInicio()!;

    /**
     * `.toISOString()` es siempre UTC y termina en "Z" — con Ecuador en UTC−5 el backend
     * descarta el offset y la fecha queda corrida (regla de CLAUDE.md). `RHH.PTCN` mapea estos
     * tres campos como `LocalDate` (bare, sin hora); se arman en hora local con el helper
     * compartido.
     */
    const datos: any = {
      empleado: { codigo: empleado.codigo },
      tipoPermiso: { codigo: tipo.codigo },
      fechaInicio: this.funcionesDatosS.formatearFechaParaBackend(fechaInicio, TipoFormatoFechaBackend.SOLO_FECHA),
      conGoce: this.formConGoce(),
      observacion: this.formObservacion().trim() || null,
      numeroDocumento: this.formNumeroDocumento().trim() || null,
      estado: 'SOLICITADA', // RHH.PTCN guarda el estado como texto
      usuarioRegistro: usuarioSesion(),
      fechaRegistro: this.funcionesDatosS.formatearFechaParaBackend(new Date(), TipoFormatoFechaBackend.SOLO_FECHA),
      fechaFin: this.funcionesDatosS.formatearFechaParaBackend(this.formFechaFin()!, TipoFormatoFechaBackend.SOLO_FECHA),
      dias: this.formDias(),
      horaInicio: this.formHoraInicio() || null,
      horaFin: this.formHoraFin() || null,
      horas: this.formHoras(),
    };

    if (this.formData.mode === 'edit' && this.formData.data) {
      datos.codigo = this.formData.data.codigo;
    }

    return datos;
  }

  formatEmpleado(empleado: Empleado): string {
    return `${empleado.identificacion} - ${empleado.apellidos} ${empleado.nombres}`;
  }

  private extractError(error: any): string | null {
    return mensajeDeError(error, '') || null;
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

  getSubtitulo(): string {
    const tipo = this.formTipoPermiso();
    if (!tipo) return '';
    return tipo.conGoce === 'S' ? `${tipo.nombre} · con goce` : `${tipo.nombre} · sin goce`;
  }

  getEstadoColor(estado: string | number): string {
    const estadoUpper = estado?.toString().toUpperCase();
    const estadoOptions = [
      { value: 'SOLICITADA', label: 'Pendiente', color: 'warn' },
      { value: 'APROBADA', label: 'Aprobado', color: 'primary' },
      { value: 'RECHAZADA', label: 'Rechazado', color: 'accent' },
      { value: 'ANULADA', label: 'Cancelado', color: 'basic' },
    ];
    const opt = estadoOptions.find((o) => o.value === estadoUpper);
    return opt?.color || 'basic';
  }

  getEstadoLabel(estado: string | number): string {
    const estadoUpper = estado?.toString().toUpperCase();
    const estadoOptions = [
      { value: 'SOLICITADA', label: 'Pendiente' },
      { value: 'APROBADA', label: 'Aprobado' },
      { value: 'RECHAZADA', label: 'Rechazado' },
      { value: 'ANULADA', label: 'Cancelado' },
    ];
    const opt = estadoOptions.find((o) => o.value === estadoUpper);
    return opt?.label || 'Desconocido';
  }
}
