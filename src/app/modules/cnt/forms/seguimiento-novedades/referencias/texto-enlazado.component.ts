import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Referencia, Segmento, segmentarReferencias } from './detector-referencias';
import { NavegacionReferenciasService } from './navegacion-referencias.service';

const AYUDA: Record<string, string> = {
  DECISION: 'Ver la decisión en el listado de decisiones',
  ASIENTO: 'Ver el asiento con sus líneas',
  NOVEDAD: 'Abrir la novedad',
  PRESTAMO: 'Ver el préstamo, su tabla y sus pagos',
  OPERACION: 'Ver el préstamo de esta operación',
  ENTIDAD: 'Ver el partícipe (entidad) y sus préstamos',
  PAGO: 'Ver el pago del préstamo',
  COBRO: 'Ver el cobro y sus asientos',
  FILA: 'Ver la fila del extracto bancario',
  CARGA: 'Ver la carga Petro',
  CORRIDA: 'Ver la corrida del cierre de cartera',
  EJECUCION: 'Ver la ejecución de las estructuras G',
  CUENTA: 'Ver el mayor y el saldo de la cuenta en el mes',
  EMPLEADO: 'Ver el empleado o los asientos que lo citan',
  FACTURA: 'Ver la factura',
};

/**
 * C25b — Texto con sus referencias convertidas en enlaces (detector-referencias.ts). Se usa en todos los textos de la
 * pantalla: hallazgo, resolución, por qué importa, qué se registró, requerimientos, notas, flujo del mes, fichas.
 * `pre` conserva saltos de línea y espacios (textos de los .txt).
 */
@Component({
  selector: 'app-texto-enlazado',
  standalone: true,
  imports: [MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class.pre]="pre()">@for (s of segmentos(); track $index) {@if (s.ref) {<a [class]="'ref ref-' + s.ref.tipo.toLowerCase()" (click)="abrir(s.ref, $event)" [matTooltip]="ayuda(s.ref)">{{ s.texto }}</a>} @else {<span>{{ s.texto }}</span>}}</span>`,
  styles: [
    `
      .pre { white-space: pre-wrap; word-break: break-word; }
      .ref { color: #1d4ed8; cursor: pointer; text-decoration: underline dotted; text-underline-offset: 2px; }
      .ref:hover { text-decoration: underline solid; background: #eff6ff; }
      .ref-decision { color: #5b21b6; }
      .ref-novedad { color: #0f766e; font-weight: 600; }
    `,
  ],
})
export class TextoEnlazadoComponent {
  private nav = inject(NavegacionReferenciasService);

  texto = input<string | null | undefined>(null);
  pre = input(false);
  idEmpresa = input<number | null>(null);
  anio = input<number | null>(null);
  mes = input<number | null>(null);
  modulo = input<string | null>(null);

  segmentos = computed<Segmento[]>(() => segmentarReferencias(this.texto(), { anio: this.anio() }));

  ayuda(r: Referencia): string {
    return `${AYUDA[r.tipo] ?? 'Ver'} (${r.valor})`;
  }

  abrir(r: Referencia, ev: Event): void {
    ev.stopPropagation();
    this.nav.abrir(r, { idEmpresa: this.idEmpresa(), anio: this.anio(), mes: this.mes(), modulo: this.modulo() });
  }
}
