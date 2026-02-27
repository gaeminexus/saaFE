import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface ConfirmDeleteDetalleData {
  descripcion: string;
}

@Component({
  selector: 'app-confirm-delete-detalle-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog">
      <div class="icon-wrapper warn">
        <mat-icon>delete_forever</mat-icon>
      </div>
      <h2 class="title">Eliminar Detalle</h2>
      <p class="message">
        ¿Confirma eliminar el detalle <strong>{{ data.descripcion }}</strong>?<br>
        <small>Esta acción no se puede deshacer.</small>
      </p>
      <div class="actions">
        <button mat-button (click)="onCancel()">Cancelar</button>
        <button mat-raised-button color="warn" (click)="onConfirm()">
          <mat-icon>check</mat-icon>
          Eliminar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog { padding: 20px 22px; max-width: 360px; }
    .icon-wrapper { width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:12px; }
    .icon-wrapper.warn { background: linear-gradient(135deg,#ff5252,#d32f2f); color:#fff; }
    .title { margin:0 0 8px; font-size:1.15rem; font-weight:600; }
    .message { margin:0 0 16px; line-height:1.4; }
    .actions { display:flex; justify-content:flex-end; gap:12px; }
    button mat-icon { margin-right:4px; }
    strong { color:#d32f2f; }
  `]
})
export class ConfirmDeleteDetalleDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDeleteDetalleData,
    private dialogRef: MatDialogRef<ConfirmDeleteDetalleDialogComponent>
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
