import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EvaluacionOtorgamiento } from '../../model/evaluacion-otorgamiento';

/**
 * Evaluación del otorgamiento (capacidad de pago y cupo) como panel de solo lectura: valores y dos
 * semáforos «cumple / no cumple / no evaluable». Lo usan `prestamo-edit` y los simuladores. No
 * bloquea nada: la garantía es el 422 del backend al guardar o aprobar.
 */
@Component({
  selector: 'app-evaluacion-otorgamiento-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="eval-panel">
      <h3 class="eval-titulo">
        <mat-icon>rule</mat-icon> {{ titulo() }}
        @if (cargando()) {
          <mat-spinner diameter="16"></mat-spinner>
        }
      </h3>

      @if (evaluacion(); as ev) {
        @if (!ev.aplicaReglas) {
          <p class="eval-no-aplica">{{ ev.motivoNoAplica || 'Las reglas del otorgamiento no aplican a este crédito.' }}</p>
        } @else {
          <div class="eval-grid">
            <div class="eval-item"><span>Remuneración</span><strong>{{ ev.remuneracion | number: '1.2-2' }}</strong></div>
            <div class="eval-item"><span>Capacidad de pago (50 %)</span><strong>{{ ev.capacidadPago | number: '1.2-2' }}</strong></div>
            <div class="eval-item"><span>Cuotas vigentes</span><strong>{{ ev.cuotasVigentes | number: '1.2-2' }}</strong></div>
            <div class="eval-item"><span>Cuota nueva</span><strong>{{ ev.cuotaNueva | number: '1.2-2' }}</strong></div>
            <div class="eval-item"><span>Cuenta individual</span><strong>{{ ev.saldoCuentaIndividual | number: '1.2-2' }}</strong></div>
            <div class="eval-item"><span>Saldo de créditos vigentes</span><strong>{{ ev.saldoCapitalVigentes | number: '1.2-2' }}</strong></div>
            <div class="eval-item"><span>Saldo quirografarios y emergentes</span><strong>{{ ev.saldoCapitalCupo | number: '1.2-2' }}</strong></div>
            <div class="eval-item"><span>Monto</span><strong>{{ ev.monto | number: '1.2-2' }}</strong></div>
          </div>

          <div class="eval-semaforos">
            <span class="eval-semaforo" [ngClass]="clase(ev.capacidadOk)">
              <mat-icon>{{ icono(ev.capacidadOk) }}</mat-icon>
              Capacidad de pago: {{ texto(ev.capacidadOk) }}
            </span>
            <span class="eval-semaforo" [ngClass]="clase(ev.cupoOk)">
              <mat-icon>{{ icono(ev.cupoOk) }}</mat-icon>
              Cupo (100 % cuenta individual): {{ textoCupo(ev) }}
            </span>
          </div>

          @if (ev.mensajes?.length) {
            <ul class="eval-mensajes">
              @for (m of ev.mensajes; track $index) {
                <li>{{ m }}</li>
              }
            </ul>
          }
        }
      }
    </section>
  `,
  styles: [
    `
      .eval-panel { border: 1px solid var(--mat-sys-outline-variant, #cfd8dc); border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
      .eval-titulo { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 1rem; }
      .eval-no-aplica { margin: 0; color: #5f6b73; }
      .eval-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px 16px; }
      .eval-item { display: flex; flex-direction: column; font-size: 0.85rem; }
      .eval-item span { color: #5f6b73; }
      .eval-item strong { font-size: 1rem; }
      .eval-semaforos { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-top: 12px; }
      .eval-semaforo { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
      .eval-semaforo.cumple { color: #2e7d32; }
      .eval-semaforo.no-cumple { color: #c62828; }
      .eval-semaforo.no-evaluable { color: #6d6d6d; }
      .eval-mensajes { margin: 8px 0 0; padding-left: 20px; color: #c62828; font-size: 0.85rem; }
    `,
  ],
})
export class EvaluacionOtorgamientoPanelComponent {
  evaluacion = input<EvaluacionOtorgamiento | null>(null);
  cargando = input<boolean>(false);
  titulo = input<string>('Evaluación del otorgamiento');

  clase(ok: boolean | null | undefined): string {
    return ok == null ? 'no-evaluable' : ok ? 'cumple' : 'no-cumple';
  }

  icono(ok: boolean | null | undefined): string {
    return ok == null ? 'help_outline' : ok ? 'check_circle' : 'cancel';
  }

  /** `cupoOk` null con cuenta individual conocida = el crédito nuevo no entra en la regla (hipotecario, prendario o sin código). */
  textoCupo(ev: EvaluacionOtorgamiento): string {
    return ev.cupoOk == null && ev.saldoCuentaIndividual != null ? 'no aplica' : this.texto(ev.cupoOk);
  }

  texto(ok: boolean | null | undefined): string {
    return ok == null ? 'no evaluable' : ok ? 'cumple' : 'no cumple';
  }
}
