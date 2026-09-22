import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { CuentaBancariaBeneficiario } from '../../model/cuenta-bancaria-beneficiario';
import { LineaConfirmacionDevolucion } from './confirmar-devolucion-dialog.component';

/** Un renglón del reparto: el beneficiario y el valor calculado del lado del cliente (§5 del contrato). */
export interface LineaRepartoBeneficiario {
  beneficiario: CuentaBancariaBeneficiario;
  valor: number;
}

export interface ConfirmarDevolucionBeneficiariosData {
  participe: string;
  identificacion: string;
  /** Fecha de negocio, ya formateada para mostrar. */
  fecha: string;
  motivo: string;
  debitoAutomatico: boolean;
  referencia: string;
  lineas: LineaConfirmacionDevolucion[];
  reparto: LineaRepartoBeneficiario[];
  total: number;
}

/**
 * Confirmación previa al registro de la devolución repartida entre beneficiarios (partícipe
 * fallecido) — `docs/crd/API-DEVOLUCION-APORTES-A-BENEFICIARIOS.md` §7.4.
 *
 * Hermano de `ConfirmarDevolucionDialogComponent` (el de un partícipe vivo, que no se toca):
 * mismo estilo, pero en vez de una cuenta de destino única muestra la tabla del reparto por
 * beneficiario, y el aviso central de esta pantalla — que NO se genera una sola devolución, sino
 * **N, una por cada beneficiario** — porque es lo que hace el backend y el operador tiene que
 * saberlo antes de apretar, no descubrirlo después en el historial.
 */
@Component({
  selector: 'app-confirmar-devolucion-beneficiarios-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono">groups</mat-icon>
      Confirmar devolución a beneficiarios
    </h2>

    <mat-dialog-content>
      <p class="advertencia">
        <mat-icon>warning</mat-icon>
        Este partícipe está fallecido: se van a generar <b>{{ data.reparto.length }} devoluciones,
        una por cada beneficiario</b> — no una sola. Cada una tiene su propia orden de pago y su
        propio número. Revise el reparto antes de continuar.
      </p>

      <div class="datos">
        <div class="dato">
          <span class="l">Partícipe (fallecido)</span>
          <span class="v">{{ data.participe }}</span>
        </div>
        <div class="dato">
          <span class="l">Identificación</span>
          <span class="v">{{ data.identificacion }}</span>
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
            <th class="num">A devolver</th>
          </tr>
        </thead>
        <tbody>
          @for (l of data.lineas; track l.nombreTipoAporte) {
            <tr>
              <td>{{ l.nombreTipoAporte }}</td>
              <td class="num devolver">{{ formatMoneda(l.valor) }}</td>
            </tr>
          }
        </tbody>
      </table>

      <p class="subtitulo-reparto">Reparto por beneficiario</p>
      <table class="tabla-reparto">
        <thead>
          <tr>
            <th>Beneficiario</th>
            <th>Identificación</th>
            <th>Banco</th>
            <th class="num">Porcentaje</th>
            <th class="num">Valor</th>
          </tr>
        </thead>
        <tbody>
          @for (r of data.reparto; track r.beneficiario.codigo) {
            <tr>
              <td>{{ r.beneficiario.nombre }}</td>
              <td>{{ r.beneficiario.numeroIdentificacion }}</td>
              <td>{{ r.beneficiario.bancoExterno.nombre }}</td>
              <td class="num">{{ r.beneficiario.porcentaje | number:'1.0-2' }}%</td>
              <td class="num devolver">{{ formatMoneda(r.valor) }}</td>
            </tr>
          }
        </tbody>
      </table>

      <p class="nota-saldo">
        El reparto es una proyección calculada acá para revisar antes de enviar; el backend vuelve
        a calcularlo y rechaza todo si la suma no cuadra exacto con el total a devolver.
      </p>

      <div class="total">
        <span>Total a devolver (= total repartido)</span>
        <b>{{ formatMoneda(data.total) }}</b>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="confirmar()">
        <mat-icon>check</mat-icon> Registrar {{ data.reparto.length }} devoluciones
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

    .datos {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 0.6rem 1rem; margin-bottom: 1.1rem;

      .dato { display: flex; flex-direction: column; gap: 1px; }
      .ancho-total { grid-column: 1 / -1; }
      .l { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #718096; font-weight: 700; }
      .v { font-size: 13.5px; color: #1a202c; }
    }

    table.tabla-desglose, table.tabla-reparto {
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

    .subtitulo-reparto {
      font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
      color: #4a5568; margin: 1.1rem 0 0.5rem;
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
export class ConfirmarDevolucionBeneficiariosDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmarDevolucionBeneficiariosDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmarDevolucionBeneficiariosData
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
