import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogDetail {
  label: string;
  value: string;
}

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  details?: ConfirmDialogDetail[];
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog" [class]="'dialog-' + data.type">
      <div class="dialog-header">
        <div class="dialog-icon" [class]="'icon-' + data.type">
          @switch (data.type) {
            @case ('warning') {
              <mat-icon>warning</mat-icon>
            }
            @case ('danger') {
              <mat-icon>error_outline</mat-icon>
            }
            @case ('success') {
              <mat-icon>check_circle_outline</mat-icon>
            }
            @default {
              <mat-icon>help_outline</mat-icon>
            }
          }
        </div>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>

      <mat-dialog-content>
        <p class="dialog-message">{{ data.message }}</p>

        @if (data.details && data.details.length > 0) {
          <div class="dialog-details">
            @for (detail of data.details; track $index) {
              <div class="detail-item">
                <mat-icon>chevron_right</mat-icon>
                <span><strong>{{ detail.label }}:</strong> {{ detail.value }}</span>
              </div>
            }
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" class="cancel-button">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button mat-raised-button
                [color]="data.type === 'danger' ? 'warn' : 'primary'"
                (click)="onConfirm()"
                class="confirm-button"
                cdkFocusInitial>
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 400px;
      max-width: 600px;
      padding: 1rem;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding: 0;
    }

    .dialog-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        line-height: 32px;
      }

      &.icon-info {
        background: #e3f2fd;
        color: #1976d2;
      }

      &.icon-warning {
        background: #fff3e0;
        color: #f57c00;
      }

      &.icon-danger {
        background: #ffebee;
        color: #d32f2f;
      }

      &.icon-success {
        background: #e8f5e9;
        color: #388e3c;
      }
    }

    h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e293b;
    }

    mat-dialog-content {
      padding: 0 0 2rem 0;
      color: #475569;
      line-height: 1.6;
      min-height: 60px;
    }

    .dialog-message {
      margin: 0 0 1.5rem 0;
      font-size: 1rem;
      line-height: 1.6;
    }

    .dialog-details {
      background: #f8fafc;
      border-left: 3px solid #cbd5e1;
      border-radius: 4px;
      padding: 1rem;
      margin-top: 1rem;

      .detail-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;

        &:last-child {
          margin-bottom: 0;
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #64748b;
        }

        span {
          font-size: 0.875rem;
          color: #334155;
          font-weight: 500;
        }
      }
    }

    .dialog-danger .dialog-details {
      background: #fef2f2;
      border-left-color: #ef4444;
    }

    .dialog-warning .dialog-details {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }

    mat-dialog-actions {
      padding: 1.5rem 0 0 0;
      margin: 0;
      border-top: 1px solid #e2e8f0;
      gap: 1rem;
      display: flex;
      justify-content: flex-end;

      .cancel-button {
        color: #64748b;
        padding: 0 24px;
        min-width: 100px;
        height: 40px;

        &:hover {
          background: #f1f5f9;
        }
      }

      .confirm-button {
        min-width: 120px;
        height: 40px;
        padding: 0 32px;
        font-weight: 600;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

        &:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {
    // Valores por defecto
    this.data.type = this.data.type || 'info';
    this.data.confirmText = this.data.confirmText || 'Confirmar';
    this.data.cancelText = this.data.cancelText || 'Cancelar';
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getMessageIcon(): string {
    switch (this.data.type) {
      case 'warning':
        return 'warning';
      case 'danger':
        return 'error';
      default:
        return 'info_outline';
    }
  }
}
