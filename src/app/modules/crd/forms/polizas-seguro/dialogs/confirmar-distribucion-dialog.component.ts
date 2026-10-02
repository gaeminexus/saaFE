import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { formatearMoneda } from '../../../../../shared/utils/moneda.util';

export interface ConfirmarDistribucionDialogData {
  cantidadPrestamos: number;
  valorTotal: number;
  sumaPrestamos: number;
  sumaCuotas: number;
  cuadra: boolean;
}

/**
 * Última pantalla antes de `POST /posg/{id}/distribuir` (docs/crd/API-POLIZAS-SEGURO.md §5): el
 * backend RECALCULA al confirmar, no confía en esta vista previa — así que esto es un resumen de
 * lo que el usuario ya vio, no un cálculo propio. Si `cuadra=false` el botón de confirmar ni
 * siquiera se habilita (el llamador no abre este diálogo en ese caso).
 */
@Component({
  selector: 'app-confirmar-distribucion-seguro-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono">calculate</mat-icon>
      Confirmar distribución
    </h2>

    <mat-dialog-content>
      <p>Se va a distribuir el valor del documento entre:</p>
      <ul class="resumen">
        <li><b>{{ data.cantidadPrestamos }}</b> préstamo{{ data.cantidadPrestamos === 1 ? '' : 's' }}</li>
        <li>Valor total del documento: <b>{{ formatMoneda(data.valorTotal) }}</b></li>
        <li>Suma asignada a préstamos: <b>{{ formatMoneda(data.sumaPrestamos) }}</b></li>
        <li>Suma asignada a cuotas: <b>{{ formatMoneda(data.sumaCuotas) }}</b></li>
      </ul>
      <div class="aviso" [class.aviso-ok]="data.cuadra" [class.aviso-error]="!data.cuadra">
        <mat-icon>{{ data.cuadra ? 'check_circle' : 'error_outline' }}</mat-icon>
        <span>{{ data.cuadra ? 'Cuadra al centavo.' : 'No cuadra — no se puede confirmar.' }}</span>
      </div>
      <div class="aviso">
        <mat-icon>info</mat-icon>
        <span>Se escribe el seguro en cada cuota y el documento pasa a DISTRIBUIDO. El backend vuelve a calcular todo; esto no se manda tal cual.</span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="accent" [disabled]="!data.cuadra" (click)="confirmar()">
        <mat-icon>check_circle</mat-icon> Confirmar distribución
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 0.5rem; }
    .titulo-icono { color: #667eea; }
    .resumen { margin: 0.5rem 0; padding-left: 1.25rem; }
    .resumen li { margin-bottom: 0.25rem; }
    .aviso {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: #eef2ff; border-radius: 8px; padding: 0.6rem 0.8rem;
      font-size: 0.9rem; color: #3730a3; margin-top: 0.5rem;
    }
    .aviso.aviso-ok { background: #e8f5e9; color: #1b5e20; }
    .aviso.aviso-error { background: #fdecea; color: #a52a1e; }
    .aviso mat-icon { flex-shrink: 0; }
    mat-dialog-actions button { min-height: 44px; border-radius: 10px; font-weight: 600; }
  `],
})
export class ConfirmarDistribucionDialogComponent {
  formatMoneda = formatearMoneda;

  constructor(
    private dialogRef: MatDialogRef<ConfirmarDistribucionDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmarDistribucionDialogData
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
