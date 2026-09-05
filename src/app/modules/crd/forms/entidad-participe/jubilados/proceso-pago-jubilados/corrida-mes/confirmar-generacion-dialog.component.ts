import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../../../../shared/modules/material-form.module';

export interface ConfirmarGeneracionData {
  periodo: string;
  /** COMPLETA + SOLO_CRUCE: los que de verdad van a hacer algo en esta corrida. */
  cantidadAptos: number;
  cantidadBloqueados: number;
  /** Cancela deuda. No sale de la asociación. */
  totalACruzarPrestamos: number;
  /** Sale al banco como orden de pago. Esto sí es dinero saliendo. */
  totalADinero: number;
  /**
   * Total de seguro médico de todos los jubilados (decisión del usuario, 2026-09-05: nunca fue
   * plata del jubilado — se descuenta siempre y sale siempre en una orden aparte a un proveedor).
   * No sale de la asociación hacia los jubilados. El nombre interno del campo sigue siendo
   * `totalSeguroInternoGeneral` a propósito, pendiente de que el backend proponga el renombre.
   */
  totalSeguroInternoGeneral: number;
  /** La suma de los TRES (§4ter): lo que se descuenta de las cuentas de pensión complementaria. */
  totalGeneral: number;
}

/**
 * Confirmación previa a `generarPagosDelMes`. Nombra la consecuencia antes de disparar una
 * acción que genera asientos contables y órdenes en tesorería (§3-B2 del diseño), con el mismo
 * desglose préstamos/dinero/total que ya se ve en el prevuelo — ahora que `previsualizarCorrida`
 * lo da de verdad, no hay que prometerlo sin poder cumplirlo. Precedente:
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
        Se van a generar <strong>{{ data.cantidadAptos }}</strong> pagos. Esta acción genera
        asientos contables y órdenes en tesorería.
      </p>

      <div class="desglose">
        <div class="d-item d-prestamos">
          <span class="d-label">A préstamos</span>
          <span class="d-valor">{{ formatMoneda(data.totalACruzarPrestamos) }}</span>
          <span class="d-nota">cancela deuda — no sale de la asociación</span>
        </div>
        <div class="d-item d-dinero">
          <span class="d-label">A dinero</span>
          <span class="d-valor">{{ formatMoneda(data.totalADinero) }}</span>
          <span class="d-nota">sale al banco</span>
        </div>
        <div class="d-item d-seguro-interno">
          <span class="d-label">Seguro médico (a proveedor)</span>
          <span class="d-valor">{{ formatMoneda(data.totalSeguroInternoGeneral) }}</span>
          <span class="d-nota">orden aparte a un proveedor, no a los jubilados</span>
        </div>
        <div class="d-item d-total">
          <span class="d-label">Total</span>
          <span class="d-valor">{{ formatMoneda(data.totalGeneral) }}</span>
          <span class="d-nota">se descuenta de las cuentas de pensión</span>
        </div>
      </div>

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

    .desglose {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; margin-bottom: 1rem;

      .d-item {
        display: flex; flex-direction: column; gap: 1px; border-radius: 8px; padding: 0.5rem 0.65rem;
      }
      .d-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; font-weight: 700; }
      .d-valor { font-size: 1.05rem; font-weight: 700; }
      .d-nota { font-size: 0.66rem; line-height: 1.25; }

      .d-prestamos {
        background: #f1f5f9; .d-label, .d-nota { color: #475569; } .d-valor { color: #1e293b; }
      }
      .d-dinero {
        background: #fef2f2; .d-label, .d-nota { color: #7f1d1d; } .d-valor { color: #991b1b; }
      }
      .d-seguro-interno {
        background: #ecfeff; .d-label, .d-nota { color: #155e75; } .d-valor { color: #164e63; }
      }
      .d-total {
        background: #eef4fb; .d-label, .d-nota { color: #1e40af; } .d-valor { color: #1e3a8a; }
      }
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
