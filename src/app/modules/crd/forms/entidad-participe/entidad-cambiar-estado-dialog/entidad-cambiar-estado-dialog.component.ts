import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Entidad } from '../../../model/entidad';
import { EstadoParticipe } from '../../../model/estado-participe';

export interface CambiarEstadoDialogData {
  entidad: Entidad;
  estadosDisponibles: EstadoParticipe[];
}

export interface CambiarEstadoDialogResult {
  nuevoEstado: number;
  motivo: string;
}

@Component({
  selector: 'app-entidad-cambiar-estado-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './entidad-cambiar-estado-dialog.component.html',
  styleUrl: './entidad-cambiar-estado-dialog.component.scss',
})
export class EntidadCambiarEstadoDialogComponent {
  private fb = inject(FormBuilder);

  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<EntidadCambiarEstadoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CambiarEstadoDialogData
  ) {
    // Inicializar formulario vacío para que el usuario elija
    this.form = this.fb.group({
      nuevoEstado: [null, Validators.required],
      motivo: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  /**
   * Obtiene el nombre del estado actual de la entidad
   */
  getNombreEstadoActual(): string {
    const estadoActual = this.data.estadosDisponibles.find(
      (e) => e.codigo === this.data.entidad.idEstado
    );
    return estadoActual?.nombre || 'Desconocido';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.form.valid) {
      const result: CambiarEstadoDialogResult = {
        nuevoEstado: this.form.value.nuevoEstado,
        motivo: this.form.value.motivo.trim(),
      };
      this.dialogRef.close(result);
    }
  }
}
