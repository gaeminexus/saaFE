import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

export interface MotivoAnulacionDialogData {
  numero: string;
}

@Component({
  selector: 'app-motivo-anulacion-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>Anular Factura N° {{ data.numero }}</h2>

    <mat-dialog-content>
      <p style="margin-bottom: 12px; color: #c62828;">
        Esta acción no se puede deshacer. Ingrese el motivo de anulación.
      </p>
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Motivo de anulación</mat-label>
        <textarea
          matInput
          [(ngModel)]="motivo"
          rows="4"
          maxlength="300"
          placeholder="Descripción del motivo de anulación"
          required>
        </textarea>
        <mat-hint align="end">{{ motivo.length }}/300</mat-hint>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button
        mat-raised-button
        color="warn"
        [disabled]="!motivo.trim()"
        (click)="confirmar()">
        Anular Factura
      </button>
    </mat-dialog-actions>
  `,
})
export class MotivoAnulacionDialogComponent {
  motivo = '';

  constructor(
    private dialogRef: MatDialogRef<MotivoAnulacionDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) public data: MotivoAnulacionDialogData
  ) {}

  confirmar(): void {
    const motivo = this.motivo.trim();
    if (!motivo) return;
    this.dialogRef.close(motivo);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
