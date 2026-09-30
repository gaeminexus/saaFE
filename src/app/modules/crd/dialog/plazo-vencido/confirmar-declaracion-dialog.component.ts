import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { formatearMoneda } from '../../../../shared/utils/moneda.util';

export interface ConfirmarDeclaracionDialogData {
  cantidadPrestamos: number;
  totalPorCobrar: number;
  cuotasSinSeguro: number;
  /**
   * Un renglón por préstamo seleccionado. Con filtros y paginado en la tabla (ítem 1/2 del pedido
   * del árbitro del 2026-09-30), la selección puede incluir préstamos que hoy no están visibles —
   * esta lista es la única forma de que el usuario vea TODO lo que va a declarar antes de
   * confirmar, esté o no en pantalla.
   *
   * `numeroMemorandoPreview` es la VISTA PREVIA armada en el cliente (D26,
   * docs/crd/API-PASE-A-PLAZO-VENCIDO.md §5) — todavía no existe el compuesto real, que solo
   * devuelve el backend al declarar. Nunca se manda al backend: el POST solo lleva el número.
   */
  filas: { numeroPrestamo: string; numeroMemorandoPreview: string }[];
}

/**
 * Última pantalla antes de `POST /plvn/declarar` (docs/crd/API-PASE-A-PLAZO-VENCIDO.md §11): el
 * backend recalcula todo de nuevo a la fecha de corte, así que esto es un resumen de lo que el
 * usuario ya vio en la tabla, no un cálculo propio — nada de esto se manda al backend.
 */
@Component({
  selector: 'app-confirmar-declaracion-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono">gavel</mat-icon>
      Declarar plazo vencido
    </h2>

    <mat-dialog-content>
      <p>Se va a declarar en plazo vencido a:</p>
      <ul class="resumen">
        <li><b>{{ data.cantidadPrestamos }}</b> préstamo{{ data.cantidadPrestamos === 1 ? '' : 's' }}</li>
        <li>Total por cobrar: <b>{{ formatMoneda(data.totalPorCobrar) }}</b></li>
        <li>
          Cuotas que quedan <b>sin desgravamen ni seguro de incendio</b>:
          <b>{{ data.cuotasSinSeguro }}</b>
        </li>
      </ul>
      <div class="aviso">
        <mat-icon>info</mat-icon>
        <span>Cada préstamo pasa a estado DE_PLAZO_VENCIDO. No genera ningún asiento contable.</span>
      </div>

      <div class="lista-prestamos">
        <div class="lista-prestamos-titulo">Préstamos seleccionados (aunque no estén visibles en la tabla):</div>
        <div class="lista-prestamos-chips">
          @for (fila of data.filas; track fila.numeroPrestamo) {
            <span class="chip-prestamo">
              {{ fila.numeroPrestamo }}
              @if (fila.numeroMemorandoPreview) {
                <span class="chip-memorando"> — {{ fila.numeroMemorandoPreview }}</span>
              }
            </span>
          }
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="accent" (click)="confirmar()">
        <mat-icon>check_circle</mat-icon> Declarar plazo vencido
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
    .aviso mat-icon { flex-shrink: 0; }
    .lista-prestamos { margin-top: 0.75rem; }
    .lista-prestamos-titulo { font-size: 0.82rem; color: #666; margin-bottom: 0.4rem; }
    .lista-prestamos-chips {
      display: flex; flex-wrap: wrap; gap: 0.35rem;
      max-height: 140px; overflow-y: auto; padding-right: 0.25rem;
    }
    .chip-prestamo {
      background: #eef2ff; color: #3730a3; border-radius: 12px;
      padding: 0.15rem 0.6rem; font-size: 0.82rem; font-weight: 600;
    }
    .chip-memorando { font-weight: 400; color: #4b4f9e; }
    mat-dialog-actions button { min-height: 44px; border-radius: 10px; font-weight: 600; }
  `],
})
export class ConfirmarDeclaracionDialogComponent {
  formatMoneda = formatearMoneda;

  constructor(
    private dialogRef: MatDialogRef<ConfirmarDeclaracionDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmarDeclaracionDialogData
  ) {}

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
