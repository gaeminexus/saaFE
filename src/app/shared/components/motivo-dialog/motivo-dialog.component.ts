import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../modules/material-form.module';

export interface MotivoDialogData {
  titulo: string;
  /** Texto explicativo sobre el efecto de la acción. */
  advertencia?: string;
  textoConfirmar?: string;
  /**
   * Exige tildar una casilla antes de habilitar el botón. Se usa cuando la
   * acción deshace contabilidad ya generada (revertir un pago confirmado).
   */
  requiereDobleConfirmacion?: boolean;
  textoDobleConfirmacion?: string;
}

/** Diálogo genérico para las acciones que exigen un motivo obligatorio. */
@Component({
  selector: 'app-motivo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>

    <mat-dialog-content>
      @if (data.advertencia) {
        <p class="advertencia">{{ data.advertencia }}</p>
      }

      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Motivo</mat-label>
        <textarea
          matInput
          [(ngModel)]="motivo"
          rows="4"
          maxlength="300"
          placeholder="Explique el motivo de esta acción"
          required>
        </textarea>
        <mat-hint align="end">{{ motivo.length }}/300</mat-hint>
      </mat-form-field>

      @if (data.requiereDobleConfirmacion) {
        <mat-checkbox [(ngModel)]="confirmado" color="warn">
          {{ data.textoDobleConfirmacion || 'Entiendo que esta acción deshace la contabilidad ya generada.' }}
        </mat-checkbox>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="warn" [disabled]="!puedeConfirmar" (click)="confirmar()">
        {{ data.textoConfirmar || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .advertencia {
      margin-bottom: 12px;
      color: #c62828;
    }
    mat-checkbox {
      display: block;
      margin-top: 4px;
    }
  `],
})
export class MotivoDialogComponent {
  motivo = '';
  confirmado = false;

  constructor(
    private dialogRef: MatDialogRef<MotivoDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) public data: MotivoDialogData
  ) {}

  get puedeConfirmar(): boolean {
    if (!this.motivo.trim()) return false;
    return !this.data.requiereDobleConfirmacion || this.confirmado;
  }

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    this.dialogRef.close(this.motivo.trim());
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
