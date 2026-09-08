import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../../../../shared/modules/material-form.module';

/** Un renglón del desglose de montos del diálogo. */
export interface ItemDesgloseConfirmacion {
  label: string;
  valor: number;
  nota?: string;
  /** Color del bloque — mismo criterio visual que ya usaban préstamos/dinero/seguro/total. */
  clase?: 'prestamos' | 'dinero' | 'seguro-interno' | 'total';
}

export interface ConfirmarGeneracionData {
  /** `mat-icon` del título. Por defecto `payments`. */
  icono?: string;
  titulo: string;
  periodo: string;
  /** Frase completa: qué va a pasar. No se compone a partir de campos sueltos. */
  advertencia: string;
  desglose: ItemDesgloseConfirmacion[];
  /** Aviso secundario opcional (p. ej. bloqueados en el prevuelo). */
  avisoExtra?: string;
  /** Por defecto, la nota de idempotencia/no-reversible de siempre. */
  nota?: string;
  textoBoton?: string;
}

/**
 * Confirmación genérica antes de disparar un proceso que mueve plata al banco y no tiene
 * anulación. Generalizado (2026-09-07, docs/crd/API-DOS-PROCESOS-MENSUALES-JUBILADOS.md §4/ítem 4)
 * para servir tanto a "Generar seguro médico" como a "Generar pensiones" — antes tenía cuatro
 * campos de desglose fijos (préstamos/dinero/seguro/total) pensados solo para la corrida única;
 * ahora el desglose es una lista, así que cada acción manda solo los montos que le aplican.
 * Precedente: `devolucion-aportes/confirmar-devolucion-dialog.component.ts`.
 */
@Component({
  selector: 'app-confirmar-generacion-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono">{{ data.icono || 'payments' }}</mat-icon>
      {{ data.titulo }} — {{ data.periodo }}
    </h2>

    <mat-dialog-content>
      <p class="advertencia">
        <mat-icon>warning</mat-icon>
        {{ data.advertencia }}
      </p>

      @if (data.desglose.length) {
        <div class="desglose" [class.desglose-una-col]="data.desglose.length === 1">
          @for (item of data.desglose; track item.label) {
            <div class="d-item" [class]="'d-' + (item.clase || 'total')">
              <span class="d-label">{{ item.label }}</span>
              <span class="d-valor">{{ formatMoneda(item.valor) }}</span>
              @if (item.nota) {
                <span class="d-nota">{{ item.nota }}</span>
              }
            </div>
          }
        </div>
      }

      @if (data.avisoExtra) {
        <p class="bloqueados-aviso">
          <mat-icon>info</mat-icon>
          {{ data.avisoExtra }}
        </p>
      }

      <p class="nota">
        {{ data.nota || 'La corrida es idempotente: volver a ejecutarla no duplica lo ya generado. No es reversible desde esta pantalla.' }}
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">
        <mat-icon>play_circle</mat-icon> {{ data.textoBoton || 'Confirmar' }}
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

      &.desglose-una-col { grid-template-columns: 1fr; }

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
