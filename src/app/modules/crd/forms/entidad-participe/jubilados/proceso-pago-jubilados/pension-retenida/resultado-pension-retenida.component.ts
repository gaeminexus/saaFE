import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { LineaPensionRetenida, ResultadoPensionRetenida } from '../../../../../model/pago-pension-complementaria';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Texto «mes aaaa» de una línea de pensión retenida. */
export function nombreMesRetenido(l: LineaPensionRetenida): string {
  return `${MESES[(l.mes ?? 1) - 1] ?? l.mes} ${l.anio}`;
}

/**
 * Resultado de `POST pgpc/pagarRetenidos` para un jubilado: lo pagado y lo no pagado con su motivo.
 * Contrato: saaBE docs/logica-negocio/crd/API-PENSION-RETENIDA.md.
 */
@Component({
  selector: 'app-resultado-pension-retenida',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resultado(); as r) {
      <section class="pr-panel">
        <h3><mat-icon>fact_check</mat-icon> Pensiones retenidas: {{ titulo() }}</h3>
        @if (mensaje()) {
          <p>{{ mensaje() }}</p>
        }
        @if (r.pagados.length > 0) {
          <strong>Pagado: $ {{ r.totalPagado | number: '1.2-2' }}</strong>
          <ul>
            @for (l of r.pagados; track l.idPago) {
              <li>{{ nombreMes(l) }} — $ {{ l.valor | number: '1.2-2' }}@if (l.idOrdenPago) { · orden {{ l.idOrdenPago }} }</li>
            }
          </ul>
        }
        @if (r.noPagados.length > 0) {
          <strong class="pr-no-pagado">No pagado: $ {{ r.totalNoPagado | number: '1.2-2' }}</strong>
          <ul>
            @for (l of r.noPagados; track l.idPago) {
              <li>{{ nombreMes(l) }} — $ {{ l.valor | number: '1.2-2' }}: {{ l.motivo || 'sin motivo informado' }}</li>
            }
          </ul>
        }
        <button mat-button type="button" (click)="cerrar.emit()">Cerrar</button>
      </section>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .pr-panel { border: 1px solid #90a4ae; background: #f5f7f8; border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
      .pr-panel h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 1rem; }
      ul { margin: 4px 0 8px; padding-left: 20px; }
      .pr-no-pagado { color: #b91c1c; }
    `,
  ],
})
export class ResultadoPensionRetenidaComponent {
  resultado = input<ResultadoPensionRetenida | null>(null);
  titulo = input<string>('');
  mensaje = input<string | null>(null);
  cerrar = output<void>();
  readonly nombreMes = nombreMesRetenido;
}
