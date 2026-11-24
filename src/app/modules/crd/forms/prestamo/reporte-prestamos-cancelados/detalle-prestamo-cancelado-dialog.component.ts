import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { PrestamoCanceladoFila } from '../../../model/prestamo-cancelado';
import {
  CAMPOS_PRESTAMO_CANCELADO,
  CampoPrestamoCancelado,
  GRUPOS_CAMPOS_PRESTAMO_CANCELADO,
} from '../../../model/prestamo-cancelado-campos';

/** «Ver detalle»: los 56 campos de la fila agrupados como pide el §8 del contrato. */
@Component({
  selector: 'app-detalle-prestamo-cancelado-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Préstamo cancelado {{ fila.numeroOperacion ?? fila.idPrestamo }} — {{ fila.nombreSocio }}</h2>
    <mat-dialog-content class="detalle-contenido">
      @for (grupo of grupos; track grupo.nombre) {
        <section class="grupo">
          <h3>{{ grupo.nombre }}</h3>
          <dl class="campos">
            @for (campo of grupo.campos; track campo.clave) {
              <div class="campo">
                <dt>{{ campo.encabezado }}</dt>
                <dd [class.numero]="campo.tipo !== 'texto'">{{ valor(campo) }}</dd>
              </div>
            }
          </dl>
        </section>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .detalle-contenido { max-height: 70vh; min-width: min(900px, 90vw); }
      .grupo { margin-bottom: 16px; }
      .grupo h3 { margin: 0 0 8px; font-size: 14px; font-weight: 600; border-bottom: 1px solid rgba(128, 128, 128, 0.35); padding-bottom: 4px; }
      .campos { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px 16px; margin: 0; }
      .campo dt { font-size: 11px; opacity: 0.7; }
      .campo dd { margin: 0; font-size: 13px; word-break: break-word; }
      .campo dd.numero { font-variant-numeric: tabular-nums; }
    `,
  ],
})
export class DetallePrestamoCanceladoDialogComponent {
  fila = inject<PrestamoCanceladoFila>(MAT_DIALOG_DATA);

  grupos = GRUPOS_CAMPOS_PRESTAMO_CANCELADO.map((nombre) => ({
    nombre,
    campos: CAMPOS_PRESTAMO_CANCELADO.filter((c) => c.grupo === nombre),
  }));

  valor(campo: CampoPrestamoCancelado): string {
    const v = this.fila[campo.clave];
    if (v === null || v === undefined || v === '') return '—';
    if (campo.tipo === 'monto') return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return String(v);
  }
}
