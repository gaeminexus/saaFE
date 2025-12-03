import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmacionDialogData {
  titulo: string;
  mensaje: string;
  tipoIcono?: 'warning' | 'question' | 'info';
}

@Component({
  selector: 'app-confirmacion-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirmacion-dialog">
      <h2
        mat-dialog-title
        class="dialog-title"
        [ngClass]="'tipo-' + (data.tipoIcono || 'question')"
      >
        <mat-icon class="dialog-icon">
          @if (data.tipoIcono === 'warning') { warning } @else if (data.tipoIcono === 'info') { info
          } @else { help_outline }
        </mat-icon>
        <span>{{ data.titulo }}</span>
      </h2>

      <mat-dialog-content class="dialog-content">
        <p class="mensaje">{{ data.mensaje }}</p>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" class="btn-cancel">
          <mat-icon>close</mat-icon>
          <span>Cancelar</span>
        </button>
        <button mat-raised-button color="primary" (click)="onConfirm()" class="btn-confirm">
          <mat-icon>check_circle</mat-icon>
          <span>Confirmar</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .confirmacion-dialog {
        min-width: 400px;
        max-width: 500px;

        .dialog-title {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 24px;
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: white;

          &.tipo-warning {
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
          }

          &.tipo-question {
            background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
          }

          &.tipo-info {
            background: linear-gradient(135deg, #00bcd4 0%, #0097a7 100%);
          }

          .dialog-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
          }
        }

        .dialog-content {
          padding: 24px;

          .mensaje {
            font-size: 16px;
            line-height: 1.6;
            color: #2d3748;
            margin: 0;
            white-space: pre-line;
          }
        }

        .dialog-actions {
          padding: 16px 24px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #f7fafc;

          .btn-cancel {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .btn-confirm {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;

            mat-icon {
              font-size: 20px;
              width: 20px;
              height: 20px;
            }
          }
        }
      }

      @media (max-width: 600px) {
        .confirmacion-dialog {
          min-width: auto;
          width: 100%;

          .dialog-actions {
            flex-direction: column-reverse;

            button {
              width: 100%;
            }
          }
        }
      }
    `,
  ],
})
export class ConfirmacionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmacionDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
