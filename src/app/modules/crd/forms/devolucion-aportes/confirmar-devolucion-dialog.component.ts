import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DeudaVigenteParticipe } from '../../model/devolucion/devolucion-aporte';

/** Un renglón del desglose que se muestra antes de confirmar. */
export interface LineaConfirmacionDevolucion {
  nombreTipoAporte: string;
  valor: number;
  /** Saldo del tipo antes de la devolución, para que se vea de dónde sale el dinero. */
  saldoActual: number;
}

export interface ConfirmarDevolucionData {
  participe: string;
  identificacion: string;
  /** Cuenta del partícipe a la que se transfiere, ya enmascarada. */
  cuentaDestino: string;
  /** Fecha de negocio, ya formateada para mostrar. */
  fecha: string;
  motivo: string;
  debitoAutomatico: boolean;
  referencia: string;
  lineas: LineaConfirmacionDevolucion[];
  total: number;
  /**
   * Deuda vigente del partícipe, si se pudo consultar. Es un AVISO: se muestra cuando
   * `totalDeuda > 0` y no condiciona nada — el botón de confirmar queda habilitado igual, la
   * devolución no descuenta ni paga esos préstamos, y el backend tampoco la valida (§10.2).
   * `null` cuando no hay deuda que mostrar o cuando la consulta no llegó.
   */
  deuda: DeudaVigenteParticipe | null;
  /**
   * `true` cuando `GET /dvap/deudaVigente` falló o respondió `exito: false`. Distingue "no se
   * pudo consultar" de "no tiene deuda" (§6.5 del plan): sin esto ambos casos se ven idénticos
   * desde la silla del operador. Tampoco bloquea nada.
   */
  deudaConsultaFallida: boolean;
}

/**
 * Confirmación previa al registro de la devolución.
 *
 * Es dinero saliendo del fondo: la §7 del plan exige mostrar el desglose por tipo de aporte y el
 * total antes de enviar nada. El diálogo no llama al backend — solo devuelve `true` si el usuario
 * confirma.
 */
@Component({
  selector: 'app-confirmar-devolucion-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono">undo</mat-icon>
      Confirmar devolución de aportes
    </h2>

    <mat-dialog-content>
      <p class="advertencia">
        <mat-icon>warning</mat-icon>
        Se van a generar los aportes negativos del partícipe y una orden de pago en Cuentas por
        Pagar. Revise el desglose antes de continuar.
      </p>

      <!--
        Aviso de deuda vigente (§6.5 / §10.2 del plan). Es informativo: NO deshabilita el botón
        de confirmar, no pide una confirmación extra y no cambia el flujo. El operador decide.
      -->
      @if (data.deuda && data.deuda.totalDeuda > 0) {
        <div class="deuda-aviso">
          <div class="da-head">
            <mat-icon>report_problem</mat-icon>
            <div>
              <b>El partícipe tiene deuda vigente por {{ formatMoneda(data.deuda.totalDeuda) }}</b>
              <p>
                {{ data.deuda.cantidadPrestamos }}
                {{ data.deuda.cantidadPrestamos === 1 ? 'préstamo sin cancelar' : 'préstamos sin cancelar' }}{{ data.deuda.tieneMora ? ', con cuotas vencidas' : '' }}.
                Esta devolución no los paga ni los descuenta: si continúa, se registra igual y los
                préstamos quedan como están.
              </p>
            </div>
          </div>

          @if (data.deuda.prestamos && data.deuda.prestamos.length) {
            <table class="tabla-deuda">
              <thead>
                <tr>
                  <th>Préstamo</th>
                  <th>Estado</th>
                  <th class="num">Saldo pendiente</th>
                  <th class="num">Cuotas vencidas</th>
                </tr>
              </thead>
              <tbody>
                @for (p of data.deuda.prestamos; track p.idPrestamo) {
                  <tr>
                    <td>
                      {{ p.producto || 'Sin producto' }}
                      <span class="da-id">#{{ p.idAsoprep ?? p.idPrestamo }}</span>
                    </td>
                    <td>{{ p.estadoTexto }}</td>
                    <td class="num">{{ formatMoneda(p.saldoPendiente) }}</td>
                    <td class="num" [class.con-mora]="p.cuotasVencidas > 0">{{ p.cuotasVencidas }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      } @else if (data.deudaConsultaFallida) {
        <!--
          Tercer estado del aviso de deuda (§6.5 del plan, ratificado por el árbitro): si la
          consulta no se pudo resolver, no puede verse igual que "no tiene deuda". Línea gris
          tenue, sin bloquear nada.
        -->
        <p class="deuda-desconocida">
          <mat-icon>help_outline</mat-icon>
          No se pudo consultar la deuda vigente del partícipe.
        </p>
      }

      <div class="datos">
        <div class="dato">
          <span class="l">Partícipe</span>
          <span class="v">{{ data.participe }}</span>
        </div>
        <div class="dato">
          <span class="l">Identificación</span>
          <span class="v">{{ data.identificacion }}</span>
        </div>
        <div class="dato">
          <span class="l">Cuenta de destino</span>
          <span class="v">{{ data.cuentaDestino }}</span>
        </div>
        <div class="dato">
          <span class="l">Sale de</span>
          <span class="v v-pendiente">La asigna Tesorería al aprobar el pago</span>
        </div>
        <div class="dato">
          <span class="l">Fecha</span>
          <span class="v">{{ data.fecha }}</span>
        </div>
        @if (data.debitoAutomatico) {
          <div class="dato">
            <span class="l">Débito automático</span>
            <span class="v">Sí{{ data.referencia ? ' · ' + data.referencia : '' }}</span>
          </div>
        }
        @if (data.motivo) {
          <div class="dato ancho-total">
            <span class="l">Motivo</span>
            <span class="v">{{ data.motivo }}</span>
          </div>
        }
      </div>

      <table class="tabla-desglose">
        <thead>
          <tr>
            <th>Tipo de aporte</th>
            <th class="num">Saldo actual</th>
            <th class="num">A devolver</th>
            <th class="num">Saldo restante</th>
          </tr>
        </thead>
        <tbody>
          @for (l of data.lineas; track l.nombreTipoAporte) {
            <tr>
              <td>{{ l.nombreTipoAporte }}</td>
              <td class="num">{{ formatMoneda(l.saldoActual) }}</td>
              <td class="num devolver">{{ formatMoneda(l.valor) }}</td>
              <td class="num">{{ formatMoneda(l.saldoActual - l.valor) }}</td>
            </tr>
          }
        </tbody>
      </table>

      <p class="nota-saldo">
        El saldo restante es una proyección: el valor definitivo lo vuelve a calcular la base de
        datos y se refresca al terminar.
      </p>

      <div class="total">
        <span>Total a devolver</span>
        <b>{{ formatMoneda(data.total) }}</b>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">
        <mat-icon>check</mat-icon> Registrar devolución
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 0.5rem; }
    .titulo-icono { color: #667eea; }

    .advertencia {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: #fff6e0; color: #92600d; border-radius: 8px;
      padding: 0.65rem 0.85rem; font-size: 0.83rem; line-height: 1.45; margin: 0 0 1rem;
      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    }

    /* Aviso de deuda vigente: rojo para que se lea, pero sin bloquear nada. */
    .deuda-aviso {
      background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626;
      border-radius: 8px; padding: 0.75rem 0.9rem; margin-bottom: 1.1rem;

      .da-head {
        display: flex; align-items: flex-start; gap: 0.55rem; color: #991b1b; font-size: 0.83rem;

        mat-icon { font-size: 22px; width: 22px; height: 22px; color: #dc2626; flex-shrink: 0; }
        b { display: block; color: #7f1d1d; margin-bottom: 0.2rem; font-size: 0.88rem; }
        p { margin: 0; line-height: 1.45; }
      }

      table.tabla-deuda {
        width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 0.75rem;

        thead th {
          color: #991b1b; font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.03em; padding: 6px 8px; text-align: left;
          border-bottom: 1px solid #fecaca;
        }
        th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
        td { padding: 6px 8px; border-bottom: 1px solid #fee2e2; color: #7f1d1d; }
        td.con-mora { font-weight: 700; color: #dc2626; }
        .da-id { color: #b91c1c; opacity: 0.75; font-size: 11px; margin-left: 3px; }
      }
    }

    /* Tercer estado del aviso de deuda: no se pudo consultar. Gris tenue a propósito, no rojo. */
    .deuda-desconocida {
      display: flex; align-items: center; gap: 0.5rem;
      color: #94a3b8; font-size: 0.78rem; font-style: italic;
      margin: 0 0 1.1rem;
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    }

    .datos {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 0.6rem 1rem; margin-bottom: 1.1rem;

      .dato { display: flex; flex-direction: column; gap: 1px; }
      .ancho-total { grid-column: 1 / -1; }
      .l { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #718096; font-weight: 700; }
      .v { font-size: 13.5px; color: #1a202c; }
      .v-pendiente { color: #94a3b8; font-style: italic; }
    }

    table.tabla-desglose {
      width: 100%; border-collapse: collapse; font-size: 13px;

      thead th {
        background: #edf2f7; color: #2d3748; font-size: 10.5px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.03em; padding: 8px 10px; text-align: left;
        border-bottom: 1px solid #e2e8f0;
      }
      th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
      td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
      td.devolver { font-weight: 700; color: #b45309; }
    }

    .nota-saldo { font-size: 0.74rem; color: #718096; margin: 0.5rem 0 0; line-height: 1.4; }

    .total {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.1));
      border-radius: 8px; padding: 0.85rem 1.1rem; border-left: 4px solid #667eea; margin-top: 1rem;
      span { font-size: 0.8rem; color: #4a5568; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
      b { font-size: 19px; font-weight: 700; font-family: 'Roboto Mono', monospace; color: #667eea; }
    }

    mat-dialog-actions button { min-height: 44px; border-radius: 10px; font-weight: 600; }
  `],
})
export class ConfirmarDevolucionDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmarDevolucionDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmarDevolucionData
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
