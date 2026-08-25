import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { Empleado } from '../../../model/empleado';
import { EmpleadoService } from '../../../service/empleado.service';
import { referenciaEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { CampoFormularioComponent } from '../../comunes/campo-formulario/campo-formulario.component';
import { mensajeDeError } from '../../comunes/mensajes';
import { aValorDeInput } from './formato-ficha';
import { CAMPOS_DATOS_PERSONALES, SECCIONES_DATOS_PERSONALES } from './datos-personales.secciones';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Datos personales del colaborador (RHH.MPLD).
 *
 * Va en la página, no en un panel: es la sección de entrada de la ficha y se consulta más de lo
 * que se edita. Los campos de identidad, discapacidad y región no son decorativos —el porcentaje
 * de discapacidad y la enfermedad catastrófica cambian el tope de gastos personales, y la región
 * determina el período de cálculo del décimo cuarto—.
 */
@Component({
  selector: 'app-datos-personales',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CampoFormularioComponent,
  ],
  templateUrl: './datos-personales.component.html',
  styleUrls: ['./datos-personales.component.scss'],
})
export class DatosPersonalesComponent implements OnChanges {
  @Input({ required: true }) empleado!: Empleado;
  @Output() guardado = new EventEmitter<Empleado>();

  readonly secciones = SECCIONES_DATOS_PERSONALES;
  readonly guardando = signal<boolean>(false);

  formulario: FormGroup;

  constructor(
    private fb: FormBuilder,
    private empleadoService: EmpleadoService,
    private funcionesDatosS: FuncionesDatosService,
    private detalleRubroService: DetalleRubroService,
    private snackBar: MatSnackBar,
  ) {
    const controles: Record<string, any> = {};
    for (const campo of CAMPOS_DATOS_PERSONALES) {
      controles[campo.name] = [null, campo.requerido ? Validators.required : []];
    }
    this.formulario = this.fb.group(controles);
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['empleado'] && this.empleado) {
      this.formulario.reset();
      this.formulario.patchValue({
        ...this.empleado,
        fechaNacimiento: this.aFechaDeInput(this.empleado.fechaNacimiento),
        fechaIngreso: this.aFechaDeInput(this.empleado.fechaIngreso),
      } as any);
      this.formulario.markAsPristine();
    }
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.avisar('Revise los campos obligatorios.', true);
      return;
    }

    /** `fechaRegistro` no se envía: los campos de auditoría los sella el servidor. */
    const payload: any = {
      ...this.empleado,
      ...this.formulario.value,
      codigo: this.empleado.codigo,
      empresa: this.empleado.empresa ?? referenciaEmpresa(),
      usuarioRegistro: usuarioSesion(),
    };

    this.guardando.set(true);
    this.empleadoService.update(payload).subscribe({
      next: (actualizado: any) => {
        this.guardando.set(false);
        this.formulario.markAsPristine();
        this.avisar('Datos personales guardados.');
        this.guardado.emit((actualizado as Empleado) ?? payload);
      },
      error: (err: any) => {
        this.guardando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudieron guardar los datos personales.'), true);
      },
    });
  }

  private aFechaDeInput(valor: any): string | null {
    return aValorDeInput(valor, {
      detalleRubroService: this.detalleRubroService,
      funcionesDatosS: this.funcionesDatosS,
    });
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}

