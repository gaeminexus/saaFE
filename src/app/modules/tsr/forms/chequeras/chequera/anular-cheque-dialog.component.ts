import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

export interface AnularChequeDialogData {
  numeroCheque: number;
  /** Rubro 38 (motivo de anulación de cheque), ya filtrado a los códigos permitidos aquí (1, 2). */
  motivos: DetalleRubro[];
}

/**
 * Diálogo de anulación de un cheque individual. A diferencia del genérico
 * `MotivoDialogComponent` (texto libre), `POST /dtch/anular/{id}` exige un
 * `motivo` numérico del rubro 38 — aquí solo se ofrecen 1 (error de tipeo) y
 * 2 (error de usuario); 3 (chequera anulada) y 4 (pago reversado) los pone el
 * propio backend cuando la anulación viene en cascada.
 */
@Component({
  selector: 'app-anular-cheque-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>Anular cheque N° {{ data.numeroCheque }}</h2>

    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Motivo</mat-label>
        <mat-select [(ngModel)]="motivoSeleccionado">
          @for (m of data.motivos; track m.codigoAlterno) {
            <mat-option [value]="m.codigoAlterno">{{ m.descripcion }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="warn" [disabled]="motivoSeleccionado == null" (click)="confirmar()">
        Anular cheque
      </button>
    </mat-dialog-actions>
  `,
})
export class AnularChequeDialogComponent {
  motivoSeleccionado: number | null = null;

  constructor(
    private dialogRef: MatDialogRef<AnularChequeDialogComponent, number | null>,
    @Inject(MAT_DIALOG_DATA) public data: AnularChequeDialogData
  ) {}

  confirmar(): void {
    if (this.motivoSeleccionado == null) return;
    this.dialogRef.close(this.motivoSeleccionado);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
