import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

export interface RevertirDeclaracionDialogData {
  numeroMemorando: string;
  nombreParticipe: string;
}

/**
 * Pide el motivo del reverso (§7 del contrato: `motivo` es obligatorio, 400 `PARAMETRO_INVALIDO`
 * si llega vacío). El backend no persiste nada al abrir este diálogo — recién en `/revertir`.
 */
@Component({
  selector: 'app-revertir-declaracion-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono" color="warn">undo</mat-icon>
      Revertir declaración
    </h2>

    <mat-dialog-content>
      <p>
        Memorando <b>{{ data.numeroMemorando }}</b> — {{ data.nombreParticipe }}
      </p>
      <div class="aviso">
        <mat-icon>warning</mat-icon>
        <span>
          El préstamo vuelve a EN_MORA y se devuelve el seguro a las cuotas que sigan sin pagar.
          Esto no se puede deshacer.
        </span>
      </div>

      <mat-form-field appearance="outline" class="ancho-total">
        <mat-label>Motivo del reverso</mat-label>
        <textarea matInput rows="3" maxlength="500" [(ngModel)]="motivo"
                  placeholder="Ej.: el partícipe firmó acuerdo de pago" required></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="warn" (click)="confirmar()" [disabled]="!puedeConfirmar()">
        <mat-icon>undo</mat-icon> Revertir
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 0.5rem; }
    .ancho-total { width: 100%; margin-top: 0.5rem; }
    .aviso {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: #fff4e5; border-radius: 8px; padding: 0.6rem 0.8rem;
      font-size: 0.9rem; color: #7a4a00; margin: 0.5rem 0;
    }
    .aviso mat-icon { flex-shrink: 0; }
    mat-dialog-actions button { min-height: 44px; border-radius: 10px; font-weight: 600; }
  `],
})
export class RevertirDeclaracionDialogComponent {
  motivo = '';

  constructor(
    private dialogRef: MatDialogRef<RevertirDeclaracionDialogComponent, string | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: RevertirDeclaracionDialogData
  ) {}

  puedeConfirmar(): boolean {
    return this.motivo.trim().length > 0;
  }

  confirmar(): void {
    if (!this.puedeConfirmar()) return;
    this.dialogRef.close(this.motivo.trim());
  }

  cancelar(): void {
    this.dialogRef.close(undefined);
  }
}
