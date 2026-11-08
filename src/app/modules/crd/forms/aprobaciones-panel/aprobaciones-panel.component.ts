import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { EstadoAprobacionPrestamo } from '../../model/nivel-aprobacion';

/**
 * Panel «Aprobaciones» de `prestamo-edit` (DISENO-SOLICITUD-V1 §B4): con niveles configurados muestra cada nivel
 * con su estado (aprobado por / fecha / pendiente) y quiénes pueden aprobar el pendiente; sin niveles dice
 * «Aprobación en un paso». Es solo de lectura: el botón «Aprobar nivel N de M» vive en la barra de acciones.
 */
@Component({
  selector: 'app-aprobaciones-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="apr-panel">
      <h3 class="apr-titulo">
        <mat-icon>how_to_reg</mat-icon> Aprobaciones
        @if (cargando()) {
          <mat-spinner diameter="16"></mat-spinner>
        }
      </h3>

      @if (estado(); as e) {
        @if (e.mensaje) {
          <p class="apr-mensaje">{{ e.mensaje }}</p>
        }

        @if (e.sinNiveles) {
          <p class="apr-un-paso">Aprobación en un paso.</p>
        } @else if (e.niveles.length) {
          @if (e.regla) {
            <p class="apr-regla">Regla: <b>{{ e.regla.nombre }}</b> · {{ e.totalNiveles }} nivel{{ e.totalNiveles === 1 ? '' : 'es' }}</p>
          }
          <ol class="apr-niveles">
            @for (n of e.niveles; track n.idNivel) {
              <li [ngClass]="clase(n.decision, n.orden === e.nivelPendiente)">
                <mat-icon>{{ icono(n.decision, n.orden === e.nivelPendiente) }}</mat-icon>
                <div>
                  <b>Nivel {{ n.orden }}: {{ n.nombre }}</b>
                  @if (n.decision === 1) {
                    <span> · Aprobado por {{ n.aprobadoPor }} el {{ fecha(n.fecha) }}</span>
                  } @else if (n.decision === 2) {
                    <span> · Negado por {{ n.aprobadoPor }} el {{ fecha(n.fecha) }}</span>
                  } @else {
                    <span> · {{ n.orden === e.nivelPendiente ? 'Pendiente' : 'En espera' }}</span>
                  }
                  @if (n.decision == null && n.usuarios.length) {
                    <div class="apr-usuarios">Pueden aprobar: {{ n.usuarios.join(', ') }}</div>
                  }
                </div>
              </li>
            }
          </ol>
        }
      }
    </section>
  `,
  styles: [
    `
      .apr-panel { border: 1px solid var(--mat-sys-outline-variant, #cfd8dc); border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
      .apr-titulo { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 1rem; }
      .apr-mensaje { margin: 0 0 8px; color: #b26a00; }
      .apr-un-paso, .apr-regla { margin: 0 0 8px; color: #5f6b73; }
      .apr-niveles { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .apr-niveles li { display: flex; gap: 8px; align-items: flex-start; }
      .apr-niveles li.aprobado { color: #2e7d32; }
      .apr-niveles li.negado { color: #c62828; }
      .apr-niveles li.pendiente { color: #b26a00; font-weight: 500; }
      .apr-niveles li.espera { color: #6d6d6d; }
      .apr-usuarios { font-size: 0.85rem; font-weight: 400; color: #5f6b73; }
    `,
  ],
})
export class AprobacionesPanelComponent {
  private funcionesDatos = inject(FuncionesDatosService);

  estado = input<EstadoAprobacionPrestamo | null>(null);
  cargando = input<boolean>(false);

  clase(decision: number | null, pendiente: boolean): string {
    return decision === 1 ? 'aprobado' : decision === 2 ? 'negado' : pendiente ? 'pendiente' : 'espera';
  }

  icono(decision: number | null, pendiente: boolean): string {
    return decision === 1 ? 'check_circle' : decision === 2 ? 'cancel' : pendiente ? 'hourglass_top' : 'radio_button_unchecked';
  }

  /** La fecha llega como arreglo de Jackson, string o Date: siempre por `FuncionesDatosService`. */
  fecha(valor: unknown): string {
    return this.funcionesDatos.formatoFecha(valor, 2) || '';
  }
}
