import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ParametroNomina } from '../../../model/parametro-nomina';
import { ParametroNominaService } from '../../../service/parametro-nomina.service';
import {
  aniosDisponibles,
  filtrarPorAnio,
  criteriosPorEmpresa,
  referenciaEmpresa,
} from '../utiles-parametrizacion';
import {
  CAMPOS_PARAMETROS,
  SECCIONES_PARAMETROS,
  SeccionParametros,
} from './parametros-anuales.secciones';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Parámetros normativos por año (RHH.PRNM).
 *
 * Es la pantalla donde el usuario carga el SBU y las tasas cada enero. "Duplicar del año
 * anterior" copia el juego completo para que solo haya que tocar lo que cambió; nada de esto
 * vive en código.
 */
@Component({
  selector: 'app-parametros-anuales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './parametros-anuales.component.html',
  styleUrls: ['./parametros-anuales.component.scss'],
})
export class ParametrosAnualesComponent implements OnInit {
  secciones: SeccionParametros[] = SECCIONES_PARAMETROS;
  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  formulario: FormGroup;
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);
  existe = signal<boolean>(false);

  private registro: ParametroNomina | null = null;

  constructor(
    private fb: FormBuilder,
    private parametroService: ParametroNominaService,
    private snackBar: MatSnackBar,
  ) {
    const controles: Record<string, any> = {};
    for (const campo of CAMPOS_PARAMETROS) {
      controles[campo.name] = [null, campo.requerido ? Validators.required : []];
    }
    this.formulario = this.fb.group(controles);
  }

  ngOnInit(): void {
    this.cargar();
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.parametroService.selectByCriteria(criteriosPorEmpresa()).subscribe({
      next: (data) => {
        const delAnio = filtrarPorAnio(data, this.anio());
        const encontrado = delAnio.length > 0 ? delAnio[0] : null;
        this.aplicarRegistro(encontrado);
        this.cargando.set(false);
      },
      error: () => {
        this.aplicarRegistro(null);
        this.cargando.set(false);
        this.avisar('No se pudieron cargar los parámetros del año', true);
      },
    });
  }

  private aplicarRegistro(registro: ParametroNomina | null): void {
    this.registro = registro;
    this.existe.set(!!registro);
    this.formulario.reset();
    if (registro) {
      this.formulario.patchValue(registro as any);
    }
  }

  /** Copia el juego de parámetros del año anterior sin persistirlo: el usuario revisa y guarda. */
  duplicarAnioAnterior(): void {
    const anterior = this.anio() - 1;
    this.cargando.set(true);
    this.parametroService.selectByCriteria(criteriosPorEmpresa()).subscribe({
      next: (data) => {
        this.cargando.set(false);
        const delAnio = filtrarPorAnio(data, anterior);
        if (delAnio.length === 0) {
          this.avisar(`No hay parámetros cargados para ${anterior}`, true);
          return;
        }
        this.formulario.patchValue(delAnio[0] as any);
        this.formulario.markAsDirty();
        this.avisar(`Valores de ${anterior} copiados. Revise y guarde para aplicarlos a ${this.anio()}.`);
      },
      error: () => {
        this.cargando.set(false);
        this.avisar(`No se pudieron leer los parámetros de ${anterior}`, true);
      },
    });
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.avisar('Revise los campos obligatorios', true);
      return;
    }

    const payload: any = {
      ...this.formulario.value,
      empresa: referenciaEmpresa(),
      anio: this.anio(),
      estado: this.registro?.estado ?? 1,
      usuarioRegistro: usuarioSesion(),
    };
    if (this.registro?.codigo) payload.codigo = this.registro.codigo;

    this.guardando.set(true);
    const peticion = this.registro?.codigo
      ? this.parametroService.update(payload)
      : this.parametroService.add(payload);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisar(`Parámetros de ${this.anio()} guardados`);
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.avisar(this.mensajeDeError(err), true);
      },
    });
  }

  private mensajeDeError(error: any): string {
    if (typeof error === 'string') return error;
    return error?.message || 'No se pudieron guardar los parámetros';
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
