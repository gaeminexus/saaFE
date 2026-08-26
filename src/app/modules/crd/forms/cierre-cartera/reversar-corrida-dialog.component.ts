import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface ReversarCorridaData {
  /** Descripción del período que se va a reversar (ej. "Agosto 2026"). */
  periodo: string;
  idCorrida: number;
  cantidadAsientos: number;
}

export interface ReversarCorridaResult {
  motivo: string;
}

/**
 * Diálogo de confirmación del reverso de una corrida. Acción destructiva: anula los asientos
 * contables de la corrida. Pide un motivo obligatorio.
 */
@Component({
  selector: 'app-reversar-corrida-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="reversar-dialog">
      <div class="dialog-header">
        <div class="dialog-icon">
          <mat-icon>error_outline</mat-icon>
        </div>
        <h2 mat-dialog-title>Reversar corrida de cierre</h2>
      </div>

      <mat-dialog-content>
        <p class="dialog-message">
          Esta acción <strong>anula los asientos contables</strong> de la corrida
          <strong>{{ data.idCorrida }}</strong> del período <strong>{{ data.periodo }}</strong>
          @if (data.cantidadAsientos) { ({{ data.cantidadAsientos }} asiento(s)) }
          y deja el período libre para volver a ejecutarlo. No se borra ninguna fila: el
          snapshot y los registros quedan para auditoría.
        </p>

        <mat-form-field appearance="outline" class="motivo-field">
          <mat-label>Motivo del reverso *</mat-label>
          <textarea
            matInput
            [(ngModel)]="motivo"
            rows="3"
            maxlength="500"
            placeholder="Ej. Faltaba parametrizar PRENDARIO NOVACION"
          ></textarea>
          <mat-hint align="end">{{ motivo.length }}/500</mat-hint>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancelar</button>
        <button
          mat-raised-button
          color="warn"
          [disabled]="!motivo.trim()"
          (click)="onConfirm()"
        >
          <mat-icon>undo</mat-icon>
          Reversar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .reversar-dialog {
        min-width: 420px;
        max-width: 600px;
        padding: 1rem;
      }
      .dialog-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      .dialog-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #ffebee;
        color: #d32f2f;
        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
        }
      }
      h2 {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 600;
        color: #1e293b;
      }
      .dialog-message {
        color: #475569;
        line-height: 1.6;
        margin: 0 0 1rem;
      }
      .motivo-field {
        width: 100%;
      }
      mat-dialog-actions {
        padding-top: 1rem;
        gap: 0.75rem;
      }
    `,
  ],
})
export class ReversarCorridaDialogComponent {
  motivo = '';

  constructor(
    private dialogRef: MatDialogRef<ReversarCorridaDialogComponent, ReversarCorridaResult>,
    @Inject(MAT_DIALOG_DATA) public data: ReversarCorridaData,
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    const motivo = this.motivo.trim();
    if (!motivo) {
      return;
    }
    this.dialogRef.close({ motivo });
  }
}
