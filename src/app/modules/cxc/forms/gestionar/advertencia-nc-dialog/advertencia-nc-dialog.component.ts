import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

export interface AdvertenciaNcDialogData {
  numeroFactura: string;
  numerosNC: string[];
}

@Component({
  selector: 'app-advertencia-nc-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px;color:#e65100;">
      <mat-icon style="color:#e65100;">warning</mat-icon>
      Notas de Crédito Relacionadas
    </h2>

    <mat-dialog-content>
      <p style="margin-bottom:12px;">
        La factura <strong>N° {{ data.numeroFactura }}</strong> tiene
        <strong>{{ data.numerosNC.length }}</strong>
        nota{{ data.numerosNC.length > 1 ? 's' : '' }} de crédito relacionada{{ data.numerosNC.length > 1 ? 's' : '' }}:
      </p>
      <ul style="margin:0 0 16px 20px;padding:0;list-style:disc;">
        @for (nc of data.numerosNC; track nc) {
          <li style="margin-bottom:4px;font-weight:600;color:#c62828;">{{ nc }}</li>
        }
      </ul>
      <p style="color:#555;">
        ¿Desea continuar con la anulación de la factura de todas formas?
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">No, Cancelar</button>
      <button mat-raised-button color="warn" (click)="confirmar()">
        <mat-icon>delete_forever</mat-icon>
        Sí, Continuar con Anulación
      </button>
    </mat-dialog-actions>
  `,
})
export class AdvertenciaNcDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<AdvertenciaNcDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: AdvertenciaNcDialogData
  ) {}

  confirmar(): void { this.dialogRef.close(true); }
  cancelar(): void  { this.dialogRef.close(false); }
}
