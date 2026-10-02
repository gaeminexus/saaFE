import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

export interface MotivoAnularSeguroDialogData {
  numeroDocumento: string | null;
  aseguradora: string | null;
}

/**
 * Pide el motivo del anulado (§6 del contrato: `motivo` es obligatorio, 400 `PARAMETRO_INVALIDO`
 * si llega vacío). Mismo patrón que `RevertirDeclaracionDialogComponent` de plazo vencido.
 */
@Component({
  selector: 'app-motivo-anular-seguro-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono" color="warn">block</mat-icon>
      Anular documento
    </h2>

    <mat-dialog-content>
      <p>{{ data.numeroDocumento || 'Documento' }} — {{ data.aseguradora || '—' }}</p>
      <div class="aviso">
        <mat-icon>warning</mat-icon>
        <span>
          Si el documento está DISTRIBUIDO, se reversa el seguro escrito en cada cuota (salvo las que
          ya se pagaron, que no se tocan). No se puede deshacer.
        </span>
      </div>

      <mat-form-field appearance="outline" class="ancho-total">
        <mat-label>Motivo del anulado</mat-label>
        <textarea matInput rows="3" maxlength="500" [(ngModel)]="motivo"
                  placeholder="Ej.: la aseguradora corrigió la factura" required></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="warn" (click)="confirmar()" [disabled]="!puedeConfirmar()">
        <mat-icon>block</mat-icon> Anular
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
export class MotivoAnularSeguroDialogComponent {
  motivo = '';

  constructor(
    private dialogRef: MatDialogRef<MotivoAnularSeguroDialogComponent, string | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: MotivoAnularSeguroDialogData
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
