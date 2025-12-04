import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { Entidad } from '../../../model/entidad';
import { EstadoParticipe } from '../../../model/estado-participe';

export interface CambiarEstadoDialogData {
  entidad: Entidad;
  estadosDisponibles: EstadoParticipe[];
}

export interface CambiarEstadoDialogResult {
  nuevoEstado: number;
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
    MatSelectModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>swap_horiz</mat-icon>
      Cambiar Estado de Entidad
    </h2>

    <mat-dialog-content class="dialog-content">
      <div class="entidad-info">
        <div class="info-row">
          <span class="label">Código:</span>
          <span class="value">{{ data.entidad.codigo }}</span>
        </div>
        <div class="info-row">
          <span class="label">Identificación:</span>
          <span class="value">{{ data.entidad.numeroIdentificacion }}</span>
        </div>
        <div class="info-row">
          <span class="label">Razón Social:</span>
          <span class="value">{{ data.entidad.razonSocial }}</span>
        </div>
        <div class="info-row estado-actual">
          <span class="label">Estado Actual:</span>
          <span class="estado-badge">{{ getNombreEstadoActual() }}</span>
        </div>
      </div>

      <form [formGroup]="form" class="estado-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nuevo Estado</mat-label>
          <mat-select formControlName="nuevoEstado" required>
            @for (estado of data.estadosDisponibles; track estado.codigo) {
            <mat-option [value]="estado.codigo">
              {{ estado.nombre }}
            </mat-option>
            }
          </mat-select>
          @if (form.get('nuevoEstado')?.hasError('required')) {
          <mat-error>Debe seleccionar un estado</mat-error>
          }
        </mat-form-field>
      </form>

      <div class="warning-message">
        <mat-icon>info_outline</mat-icon>
        <p>
          Este cambio solo afectará el estado de la entidad. Todos los demás datos permanecerán sin
          cambios.
        </p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button (click)="onCancel()">
        <mat-icon>close</mat-icon>
        Cancelar
      </button>
      <button mat-raised-button color="primary" (click)="onConfirm()" [disabled]="form.invalid">
        <mat-icon>check</mat-icon>
        Confirmar Cambio
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .dialog-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0 0 16px 0;
        padding: 20px 24px 0;
        color: #1976d2;
        font-size: 20px;
        font-weight: 500;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }
      }

      .dialog-content {
        padding: 0 24px 20px !important;
        margin: 0 !important;
        overflow: visible !important;
        max-height: none !important;
      }

      .entidad-info {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 24px;

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);

          &:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }

          &.estado-actual {
            margin-top: 8px;
            padding-top: 12px;
            border-top: 2px solid rgba(0, 0, 0, 0.1);
          }

          .label {
            font-weight: 500;
            color: #6c757d;
            font-size: 14px;
          }

          .value {
            color: #212529;
            font-weight: 400;
            text-align: right;
            max-width: 60%;
            word-break: break-word;
          }

          .estado-badge {
            background: #28a745;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        }
      }

      .estado-form {
        margin-bottom: 20px;

        .full-width {
          width: 100%;
        }

        mat-form-field {
          font-size: 15px;
        }
      }

      .warning-message {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: #e8f4fd;
        border-left: 4px solid #2196f3;
        border-radius: 4px;
        padding: 14px 16px;

        mat-icon {
          color: #2196f3;
          flex-shrink: 0;
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        p {
          margin: 0;
          color: #0d47a1;
          font-size: 13px;
          line-height: 1.5;
        }
      }

      .dialog-actions {
        padding: 16px 24px;
        margin: 0;
        border-top: 1px solid #e0e0e0;
        background: #fafafa;

        button {
          margin-left: 12px;
          min-width: 120px;

          &:first-child {
            margin-left: 0;
          }

          mat-icon {
            margin-right: 6px;
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }
    `,
  ],
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
      };
      this.dialogRef.close(result);
    }
  }
}
