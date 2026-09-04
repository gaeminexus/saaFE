import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../../../../shared/modules/material-form.module';

export interface ConfirmarGeneracionData {
  periodo: string;
  cantidadListos: number;
  totalListos: number;
  cantidadBloqueados: number;
}

/**
 * Confirmación previa a `generarPagosDelMes`. Nombra la consecuencia antes de disparar una
 * acción que genera asientos contables y órdenes en tesorería (§3-B2 del diseño). Precedente:
 * `devolucion-aportes/confirmar-devolucion-dialog.component.ts`.
 */
@Component({
  selector: 'app-confirmar-generacion-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono">payments</mat-icon>
      Confirmar generación de pagos — {{ data.periodo }}
    </h2>

    <mat-dialog-content>
      <p class="advertencia">
        <mat-icon>warning</mat-icon>
        Se van a generar <strong>{{ data.cantidadListos }}</strong> pagos por un total de
        <strong>{{ formatMoneda(data.totalListos) }}</strong>. Esta acción genera asientos
        contables y órdenes en tesorería.
      </p>

      @if (data.cantidadBloqueados > 0) {
        <p class="bloqueados-aviso">
          <mat-icon>block</mat-icon>
          Hay <strong>{{ data.cantidadBloqueados }}</strong>
          {{ data.cantidadBloqueados === 1 ? 'jubilado bloqueado' : 'jubilados bloqueados' }} que
          no se van a pagar en esta corrida. Revise el motivo en el prevuelo antes de continuar.
        </p>
      }

      <p class="nota">
        La corrida es idempotente: volver a ejecutarla no duplica pagos ya generados. No es
        reversible desde esta pantalla.
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">
        <mat-icon>play_circle</mat-icon> Generar y contabilizar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 0.5rem; }
    .titulo-icono { color: #667eea; }

    .advertencia {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: #fff6e0; color: #92600d; border-radius: 8px;
      padding: 0.65rem 0.85rem; font-size: 0.85rem; line-height: 1.5; margin: 0 0 1rem;
      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    }

    .bloqueados-aviso {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: #fef2f2; color: #7f1d1d; border-radius: 8px;
      padding: 0.65rem 0.85rem; font-size: 0.83rem; line-height: 1.45; margin: 0 0 1rem;
      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; color: #dc2626; }
    }

    .nota { font-size: 0.75rem; color: #718096; margin: 0; line-height: 1.4; }

    mat-dialog-actions button { min-height: 44px; border-radius: 10px; font-weight: 600; }
  `],
})
export class ConfirmarGeneracionDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmarGeneracionDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmarGeneracionData,
  ) {}

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
