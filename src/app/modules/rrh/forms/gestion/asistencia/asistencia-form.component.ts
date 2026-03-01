import { CommonModule } from '@angular/common';
import { Component, computed, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  of,
  switchMap,
} from 'rxjs';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Asistencia } from '../../../model/asistencia';
import { Empleado } from '../../../model/empleado';
import { AsistenciaService } from '../../../service/asistencia.service';
import { EmpleadoService } from '../../../service/empleado.service';

export interface AsistenciaDialogData {
  asistencia?: Asistencia;
  readonly?: boolean;
}

@Component({
  selector: 'app-asistencia-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './asistencia-form.component.html',
  styleUrls: ['./asistencia-form.component.scss'],
})
export class AsistenciaFormComponent implements OnInit {
  form!: FormGroup;
  loading = signal<boolean>(false);
  guardando = signal<boolean>(false);

  // Signals para empleado
  empleadosBusqueda = signal<Empleado[]>([]);
  buscandoEmpleado = signal<boolean>(false);
  empleadoSeleccionado = signal<Empleado | null>(null);

  // Computed para validaciones
  esRetroactivo = computed(() => {
    const fechaValue = this.form?.get('fecha')?.value;
    if (!fechaValue) return false;

    const fecha = new Date(fechaValue);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);

    return fecha < hoy;
  });

  observacionRequerida = computed(() => {
    return this.esRetroactivo();
  });

  // Opciones de tipo de registro (solo manual)
  tipoRegistroOptions = [
    { value: 'ENTRADA', label: 'Entrada' },
    { value: 'SALIDA', label: 'Salida' },
  ];

  readonly = signal<boolean>(false);
  esNuevo = signal<boolean>(true);
  titulo = computed(() => {
    if (this.readonly()) return 'Ver Registro de Asistencia';
    return this.esNuevo() ? 'Nueva Marcación' : 'Editar Marcación';
  });

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AsistenciaFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsistenciaDialogData,
    private asistenciaService: AsistenciaService,
    private empleadoService: EmpleadoService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupEmpleadoSearch();

    if (this.data?.readonly) {
      this.readonly.set(true);
      this.form.disable();
    }

    if (this.data?.asistencia) {
      this.esNuevo.set(false);
      this.cargarDatos(this.data.asistencia);
    }
  }

  private initForm(): void {
    const hoy = new Date();

    this.form = this.fb.group({
      codigo: [null],
      empleadoCodigo: [null, Validators.required],
      empleadoSearch: [''],
      empleadoNombre: [{ value: '', disabled: true }],
      fecha: [hoy, Validators.required],
      horaEntrada: ['', Validators.required],
      tipoRegistro: ['ENTRADA', Validators.required],
      observacion: [''],
    });

    // Observar cambios en observacionRequerida
    this.form.statusChanges.subscribe(() => {
      const observacionControl = this.form.get('observacion');
      if (this.observacionRequerida()) {
        observacionControl?.setValidators([Validators.required]);
      } else {
        observacionControl?.clearValidators();
      }
      observacionControl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  private setupEmpleadoSearch(): void {
    this.form
      .get('empleadoSearch')
      ?.valueChanges.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((termino) => {
          // Si termino es un objeto Empleado, no buscar (ya está seleccionado)
          if (typeof termino === 'object' && termino !== null) {
            return of([]);
          }

          // Si es un string vacío o muy corto, limpiar
          if (!termino || typeof termino !== 'string' || termino.length < 3) {
            this.empleadosBusqueda.set([]);
            // Si se borra, limpiar selección
            if (!termino || termino.length === 0) {
              this.empleadoSeleccionado.set(null);
              this.form.patchValue(
                {
                  empleadoCodigo: null,
                  empleadoNombre: '',
                },
                { emitEvent: false },
              );
            }
            return of([]);
          }

          this.buscandoEmpleado.set(true);

          const terminoNormalizado = termino.trim().toUpperCase();

          return this.empleadoService.getAll().pipe(
            map((empleados) =>
              (empleados || []).filter((empleado) => {
                const estado = String(empleado.estado ?? '').toUpperCase();
                const activo = estado === '1' || estado === 'A' || estado === 'ACTIVO';
                if (!activo) return false;

                const identificacion = String(empleado.identificacion ?? '').toUpperCase();
                const nombres = String(empleado.nombres ?? '').toUpperCase();
                const apellidos = String(empleado.apellidos ?? '').toUpperCase();
                const nombreCompleto = `${nombres} ${apellidos}`.trim();

                return (
                  identificacion.includes(terminoNormalizado) ||
                  nombres.includes(terminoNormalizado) ||
                  apellidos.includes(terminoNormalizado) ||
                  nombreCompleto.includes(terminoNormalizado)
                );
              }),
            ),
            catchError(() => {
              this.buscandoEmpleado.set(false);
              return of([]);
            }),
          );
        }),
      )
      .subscribe((empleados) => {
        this.empleadosBusqueda.set(empleados || []);
        this.buscandoEmpleado.set(false);
      });
  }

  onEmpleadoSeleccionado(empleado: Empleado): void {
    this.empleadoSeleccionado.set(empleado);
    this.form.patchValue(
      {
        empleadoCodigo: empleado.codigo,
        empleadoNombre: this.getEmpleadoNombreCompleto(empleado),
        empleadoSearch: empleado, // Mantener el objeto completo para displayWith
      },
      { emitEvent: false }, // No disparar valueChanges
    );
  }

  getEmpleadoNombreCompleto(empleado: Empleado | null): string {
    if (!empleado) return '';
    return `${empleado.nombres} ${empleado.apellidos}`.trim();
  }

  displayEmpleado(empleado: Empleado | null): string {
    if (!empleado) return '';
    return `${empleado.identificacion} - ${this.getEmpleadoNombreCompleto(empleado)}`;
  }

  private cargarDatos(asistencia: Asistencia): void {
    this.empleadoSeleccionado.set(asistencia.empleado || null);

    this.form.patchValue({
      codigo: asistencia.codigo,
      empleadoCodigo: asistencia.empleadoCodigo,
      empleadoSearch: asistencia.empleado || '', // Mantener objeto completo
      empleadoNombre: this.getEmpleadoNombreCompleto(asistencia.empleado || null),
      fecha: asistencia.fecha,
      horaEntrada: asistencia.horaEntrada || this.extractHoraFromFecha(asistencia.fecha),
      tipoRegistro: asistencia.tipoRegistro,
      observacion: asistencia.observacion,
    });
  }

  async onGuardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Complete los campos obligatorios', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar retroactividad
    if (this.esRetroactivo()) {
      const confirmar = confirm(
        'Está registrando una marcación retroactiva. ¿Está seguro de continuar?',
      );
      if (!confirmar) return;
    }

    // Validar duplicidad en Marcaciones (MRCC)
    const tieneSolapamiento = await this.verificarSolapamiento();
    if (tieneSolapamiento) {
      const confirmar = confirm(
        'Ya existe una marcación para el empleado en la fecha/hora indicada. ¿Desea continuar de todas formas?',
      );
      if (!confirmar) return;
    }

    this.guardar();
  }

  private async verificarSolapamiento(): Promise<boolean> {
    const empleadoCodigo = this.form.get('empleadoCodigo')?.value;
    const fecha = this.form.get('fecha')?.value;
    const horaEntrada = this.form.get('horaEntrada')?.value;
    const tipoRegistro = this.form.get('tipoRegistro')?.value;
    const codigoActual = this.form.get('codigo')?.value;

    if (!empleadoCodigo || !fecha || !horaEntrada) return false;

    const fechaHora = this.buildFechaHoraForCriteria(fecha, horaEntrada);

    const criterios: DatosBusqueda[] = [];

    const dbEmpleado = new DatosBusqueda();
    dbEmpleado.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      String(empleadoCodigo),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbEmpleado);

    const dbFechaHora = new DatosBusqueda();
    dbFechaHora.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.DATE,
      'fechaHora',
      fechaHora,
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(dbFechaHora);

    if (tipoRegistro) {
      const dbTipo = new DatosBusqueda();
      dbTipo.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'tipo',
        String(tipoRegistro).toUpperCase(),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(dbTipo);
    }

    const existentes = await firstValueFrom(this.asistenciaService.selectByCriteria(criterios));
    const filtrados = (existentes || []).filter((item) => {
      if (!codigoActual) return true;
      return Number(item.codigo) !== Number(codigoActual);
    });

    return filtrados.length > 0;
  }

  private guardar(): void {
    this.guardando.set(true);

    const formValue = this.form.getRawValue();

    const asistencia = {
      codigo: formValue.codigo,
      empleadoCodigo: formValue.empleadoCodigo,
      fecha: this.formatFechaForBackend(formValue.fecha),
      horaEntrada: formValue.horaEntrada,
      tipoRegistro: formValue.tipoRegistro,
      observacion: formValue.observacion || null,
    };

    const observable = this.esNuevo()
      ? this.asistenciaService.add(asistencia)
      : this.asistenciaService.update(asistencia);

    observable.subscribe({
      next: (response) => {
        this.guardando.set(false);
        const mensaje = this.esNuevo()
          ? 'Marcación creada exitosamente'
          : 'Marcación actualizada exitosamente';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error al guardar asistencia:', error);
        this.guardando.set(false);
        this.snackBar.open('Error al guardar la marcación', 'Cerrar', { duration: 5000 });
      },
    });
  }

  onCancelar(): void {
    if (this.form.dirty && !this.readonly()) {
      const confirmar = confirm('¿Está seguro de cancelar? Los cambios no se guardarán.');
      if (!confirmar) return;
    }
    this.dialogRef.close(false);
  }

  // Utilidades
  private formatFechaForBackend(fecha: Date | string): string {
    if (typeof fecha === 'string') return fecha;

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private buildFechaHoraForCriteria(fecha: Date | string, horaEntrada: string): string {
    const fechaBase = this.formatFechaForBackend(fecha);
    const hora = this.normalizeHora(horaEntrada);
    return `${fechaBase} ${hora}`;
  }

  private normalizeHora(hora: any): string {
    if (!hora) return '00:00:00';
    const value = String(hora).trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
    if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
    return '00:00:00';
  }

  private extractHoraFromFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return '';
    const value = String(fecha);
    const match = value.match(/(\d{2}):(\d{2})/);
    if (!match) return '';
    return `${match[1]}:${match[2]}`;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (control?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    return '';
  }
}
