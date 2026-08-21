import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { ResumenNomina } from '../../../model/resumen-nomina';
import { CAMPOS_ASISTENCIA_PERSISTEN } from '../utiles-asistencia';

export interface CorreccionResumenData {
  resumen: ResumenNomina;
  etiquetaEmpleado: string;
  tiposAusencia: DetalleRubro[];
}

/**
 * Corrección manual de un resumen diario.
 *
 * La justificación es obligatoria: corregir a mano un día altera los días trabajados y las horas
 * extra que después se pagan, así que tiene que quedar por escrito quién lo cambió y por qué.
 *
 * **Hoy el diálogo va recortado.** De las once columnas que el script 05 agregó a `RHH.RSMN`, la
 * entidad del backend solo mapea `tipoAusencia`; las horas tipificadas, los minutos de salida
 * anticipada, la justificación y el `inconsistente` que se apaga al corregir se descartarían en
 * silencio al guardar. Mientras `CAMPOS_ASISTENCIA_PERSISTEN` valga `false` esos campos no se
 * muestran, en vez de pedirle al usuario un dato que se va a perder.
 */
@Component({
  selector: 'app-correccion-resumen-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './correccion-resumen-dialog.component.html',
  styleUrls: ['./correccion-resumen-dialog.component.scss'],
})
export class CorreccionResumenDialogComponent {
  formulario: FormGroup;

  /** Expuesto a la plantilla: gobierna qué campos se pintan. */
  camposPersisten = CAMPOS_ASISTENCIA_PERSISTEN;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CorreccionResumenDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CorreccionResumenData,
  ) {
    const resumen = data.resumen;

    // Los tres que el backend sí mapea hoy
    this.formulario = this.fb.group({
      minutosTarde: [resumen.minutosTarde ?? 0],
      tipoAusencia: [resumen.tipoAusencia ?? null],
      justificado: [resumen.justificado ?? 'N'],
    });

    if (!this.camposPersisten) return;

    this.formulario.addControl('minutosSalidaAnticipada', this.fb.control(resumen.minutosSalidaAnticipada ?? 0));
    this.formulario.addControl('horasTrabajadas', this.fb.control(resumen.horasTrabajadas ?? 0));
    this.formulario.addControl('horasSuplementarias', this.fb.control(resumen.horasSuplementarias ?? 0));
    this.formulario.addControl('horasExtraordinarias', this.fb.control(resumen.horasExtraordinarias ?? 0));
    this.formulario.addControl('horasNocturnas', this.fb.control(resumen.horasNocturnas ?? 0));
    this.formulario.addControl(
      'justificacion',
      this.fb.control(resumen.justificacion ?? '', Validators.required),
    );
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const corregido: any = { ...this.data.resumen, ...this.formulario.value };

    // Corregido a mano deja de estar marcado como inconsistente. `RSMNINCN` tampoco se mapea
    // todavía, así que apagarlo sin la compuerta no sobreviviría al guardado.
    if (this.camposPersisten) corregido.inconsistente = 'N';

    this.dialogRef.close(corregido);
  }
}
