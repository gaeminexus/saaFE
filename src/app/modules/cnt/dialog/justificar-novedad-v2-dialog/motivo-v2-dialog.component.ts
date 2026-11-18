import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

export interface MotivoV2Data {
  titulo: string;
  explicacion: string;
  etiqueta: string;
  obligatorio: boolean;
  boton: string;
}

/** C34 — Confirmación con comentario (cerrar, dar por conocida) o motivo obligatorio (anular, reabrir). */
@Component({
  selector: 'app-motivo-v2-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <p class="explicacion">{{ data.explicacion }}</p>
      <mat-form-field appearance="outline" class="ancho">
        <mat-label>{{ data.etiqueta }}{{ data.obligatorio ? '' : ' (opcional)' }}</mat-label>
        <textarea matInput rows="3" [(ngModel)]="texto"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" [disabled]="data.obligatorio && !texto.trim()" (click)="ref.close({ texto: texto.trim() })">
        {{ data.boton }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.ancho { width: 100%; min-width: min(520px, 90vw); } .explicacion { white-space: pre-line; }`],
})
export class MotivoV2DialogComponent {
  ref = inject(MatDialogRef<MotivoV2DialogComponent, { texto: string }>);
  texto = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: MotivoV2Data) {}
}
