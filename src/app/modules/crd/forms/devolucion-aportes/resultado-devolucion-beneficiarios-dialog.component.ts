import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { ResultadoDevolucionBeneficiario } from '../../model/devolucion/devolucion-aporte';

export interface ResultadoDevolucionBeneficiariosData {
  creadas: ResultadoDevolucionBeneficiario[];
}

/**
 * Muestra las devoluciones creadas tras registrar el reparto a beneficiarios, cada una con su
 * propio número (§7.4 del contrato: "mostrarlas después con su número"). No hace nada más — el
 * historial de la pantalla ya se refrescó antes de abrir este diálogo.
 */
@Component({
  selector: 'app-resultado-devolucion-beneficiarios-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono">check_circle</mat-icon>
      {{ data.creadas.length }} devoluciones registradas
    </h2>

    <mat-dialog-content>
      <p class="resumen">
        Se generó una devolución por cada beneficiario, con su propia orden de pago. Si el pago de
        alguna rebota, se reemite solo la suya desde el historial de esta pantalla.
      </p>

      <table class="tabla-resultado">
        <thead>
          <tr>
            <th>N° Devolución</th>
            <th>Beneficiario</th>
            <th>Identificación</th>
            <th class="num">Valor</th>
            <th>N° Pago (CXP)</th>
          </tr>
        </thead>
        <tbody>
          @for (r of data.creadas; track r.idDevolucion) {
            <tr>
              <td>#{{ r.idDevolucion }}</td>
              <td>{{ r.nombre }}</td>
              <td>{{ r.identificacion }}</td>
              <td class="num">{{ formatMoneda(r.valor) }}</td>
              <td>{{ r.idPago ? '#' + r.idPago : '—' }}</td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">Total</td>
            <td class="num">{{ formatMoneda(total()) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="cerrar()">
        <mat-icon>check</mat-icon> Cerrar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 0.5rem; }
    .titulo-icono { color: #16a34a; }

    .resumen { font-size: 0.85rem; color: #4a5568; line-height: 1.45; margin: 0 0 1rem; }

    table.tabla-resultado {
      width: 100%; border-collapse: collapse; font-size: 13px;

      thead th {
        background: #edf2f7; color: #2d3748; font-size: 10.5px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.03em; padding: 8px 10px; text-align: left;
        border-bottom: 1px solid #e2e8f0;
      }
      th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
      td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
      tfoot td { font-weight: 700; border-top: 2px solid #cbd5e0; border-bottom: none; color: #1a202c; }
    }

    mat-dialog-actions button { min-height: 44px; border-radius: 10px; font-weight: 600; }
  `],
})
export class ResultadoDevolucionBeneficiariosDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ResultadoDevolucionBeneficiariosDialogComponent, void>,
    @Inject(MAT_DIALOG_DATA) public data: ResultadoDevolucionBeneficiariosData
  ) {}

  total(): number {
    return +this.data.creadas.reduce((s, r) => s + (r.valor || 0), 0).toFixed(2);
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
