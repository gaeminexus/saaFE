import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface MotivoDialogData {
  titulo: string;
  etiqueta: string;
}

/**
 * Pide el motivo de una acción que hay que poder justificar después: reabrir un período o
 * excluir a un colaborador. Ambas quedan registradas en el backend, así que el motivo es
 * obligatorio.
 */
@Component({
  selector: 'app-motivo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="campo-motivo">
        <mat-label>{{ data.etiqueta }}</mat-label>
        <textarea matInput rows="3" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)"></textarea>
        @if (!motivo().trim()) {
          <mat-hint>El motivo queda registrado junto a la acción</mat-hint>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="!motivo().trim()"
        [mat-dialog-close]="motivo().trim()"
      >
        Confirmar
      </button>
    </mat-dialog-actions>
  `,
  styleUrls: ['./motivo-dialog.component.scss'],
})
export class MotivoDialogComponent {
  motivo = signal<string>('');

  constructor(
    public dialogRef: MatDialogRef<MotivoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MotivoDialogData,
  ) {}
}
