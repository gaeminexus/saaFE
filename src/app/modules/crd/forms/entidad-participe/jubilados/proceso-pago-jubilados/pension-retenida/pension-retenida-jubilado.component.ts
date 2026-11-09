import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { empresaSesionCodigo } from '../../../../../../../shared/services/empresa-sesion';
import { LineaPensionRetenida, ResultadoPensionRetenida } from '../../../../../model/pago-pension-complementaria';
import { PagoPensionComplementariaService } from '../../../../../service/pago-pension-complementaria.service';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * «Pensión retenida (sin cuenta)» de un jubilado: meses de pensión que la corrida no devengó ni pagó porque no tenía
 * una sola cuenta activa con certificado. Solo se muestra si hay retenidos pendientes. El botón «Pagar pensiones
 * retenidas» exige `tieneSalida`; si no la tiene, se muestra `motivoSinSalida`. Contrato: saaBE
 * docs/logica-negocio/crd/API-PENSION-RETENIDA.md.
 */
@Component({
  selector: 'app-pension-retenida-jubilado',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cargando()) {
      <div class="pr-estado"><mat-spinner diameter="20"></mat-spinner> Consultando pensión retenida…</div>
    } @else if (errorConsulta()) {
      <div class="pr-error"><mat-icon>error_outline</mat-icon> {{ errorConsulta() }}</div>
    }

    @if (datos(); as d) {
      @if (d.pendientes.length > 0) {
        <section class="pr-panel">
          <h3><mat-icon>savings</mat-icon> Pensión retenida (sin cuenta): $ {{ d.totalPendiente | number: '1.2-2' }}</h3>
          <p class="pr-sub">
            {{ d.pendientes.length }} mes(es) sin devengar ni pagar:
            {{ textoMeses(d.pendientes) }}.
          </p>
          <ul class="pr-meses">
            @for (l of d.pendientes; track l.idPago) {
              <li>
                {{ nombreMes(l) }} — $ {{ l.valor | number: '1.2-2' }}
                @if (l.historicoYaDevengado) {
                  <small>(histórico ya devengado)</small>
                }
              </li>
            }
          </ul>
          @if (!d.tieneSalida) {
            <p class="pr-sin-salida">
              <mat-icon>info</mat-icon>
              No se puede pagar todavía: {{ d.motivoSinSalida || 'el jubilado no tiene una sola cuenta activa con certificado.' }}
            </p>
          }
          <button mat-raised-button color="primary" type="button" (click)="pedirConfirmacion(d)" [disabled]="!d.tieneSalida || pagando()">
            @if (pagando()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>payments</mat-icon>
            }
            Pagar pensiones retenidas
          </button>
        </section>
      }
    }

    @if (resultadoPago(); as r) {
      <section class="pr-panel pr-resultado">
        <h3><mat-icon>fact_check</mat-icon> Resultado del pago de pensiones retenidas</h3>
        @if (mensajePago()) {
          <p>{{ mensajePago() }}</p>
        }
        @if (r.pagados.length > 0) {
          <strong>Pagado: $ {{ r.totalPagado | number: '1.2-2' }}</strong>
          <ul class="pr-meses">
            @for (l of r.pagados; track l.idPago) {
              <li>{{ nombreMes(l) }} — $ {{ l.valor | number: '1.2-2' }}@if (l.idOrdenPago) { · orden {{ l.idOrdenPago }} }</li>
            }
          </ul>
        }
        @if (r.noPagados.length > 0) {
          <strong class="pr-no-pagado">No pagado: $ {{ r.totalNoPagado | number: '1.2-2' }}</strong>
          <ul class="pr-meses">
            @for (l of r.noPagados; track l.idPago) {
              <li>{{ nombreMes(l) }} — $ {{ l.valor | number: '1.2-2' }}: {{ l.motivo || 'sin motivo informado' }}</li>
            }
          </ul>
        }
      </section>
    }
    @if (errorPago()) {
      <div class="pr-error"><mat-icon>error_outline</mat-icon> {{ errorPago() }}</div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .pr-panel { border: 1px solid #e0b100; background: #fffbea; border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
      .pr-resultado { border-color: #90a4ae; background: #f5f7f8; }
      .pr-panel h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 1rem; }
      .pr-sub { margin: 0 0 4px; }
      .pr-meses { margin: 4px 0 8px; padding-left: 20px; }
      .pr-sin-salida { display: flex; align-items: flex-start; gap: 6px; color: #8a4b00; margin: 8px 0; }
      .pr-no-pagado { color: #b91c1c; }
      .pr-error { display: flex; align-items: center; gap: 6px; color: #c62828; margin: 8px 0; }
      .pr-estado { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
    `,
  ],
})
export class PensionRetenidaJubiladoComponent {
  private pgpc = inject(PagoPensionComplementariaService);
  private dialog = inject(MatDialog);

  idEntidad = input<number | null>(null);
  nombre = input<string>('');

  datos = signal<ResultadoPensionRetenida | null>(null);
  cargando = signal(false);
  errorConsulta = signal<string | null>(null);
  pagando = signal(false);
  errorPago = signal<string | null>(null);
  resultadoPago = signal<ResultadoPensionRetenida | null>(null);
  mensajePago = signal<string | null>(null);

  constructor() {
    // Cambió el jubilado seleccionado: consulta de nuevo y descarta el resultado del anterior.
    effect(() => {
      const id = this.idEntidad();
      this.resultadoPago.set(null);
      this.mensajePago.set(null);
      this.errorPago.set(null);
      if (id == null) {
        this.datos.set(null);
        this.errorConsulta.set(null);
        return;
      }
      this.consultar(id);
    });
  }

  nombreMes(l: LineaPensionRetenida): string {
    return `${MESES[(l.mes ?? 1) - 1] ?? l.mes} ${l.anio}`;
  }

  textoMeses(lineas: LineaPensionRetenida[]): string {
    return lineas.map((l) => this.nombreMes(l)).join(', ');
  }

  private consultar(id: number): void {
    this.cargando.set(true);
    this.errorConsulta.set(null);
    this.pgpc.retenidos(id).subscribe({
      next: (r) => {
        if (this.idEntidad() !== id) return;
        this.datos.set(r);
        this.cargando.set(false);
      },
      error: (mensaje: string) => {
        if (this.idEntidad() !== id) return;
        this.datos.set(null);
        this.errorConsulta.set(`No se pudo consultar la pensión retenida: ${mensaje}`);
        this.cargando.set(false);
      },
    });
  }

  pedirConfirmacion(d: ResultadoPensionRetenida): void {
    const id = this.idEntidad();
    const idEmpresa = empresaSesionCodigo();
    if (id == null || !d.tieneSalida || this.pagando()) return;
    if (idEmpresa == null) {
      this.errorPago.set('No se pudo determinar la empresa de la sesión.');
      return;
    }
    const nombre = this.nombre() || 'el jubilado';
    const data: ConfirmDialogData = {
      title: 'Pagar pensiones retenidas',
      message: `Se generará una orden de pago por cada mes retenido de ${nombre}. Esta acción descuenta de su cuenta de pensión complementaria.`,
      confirmText: 'Pagar',
      cancelText: 'Cancelar',
      type: 'warning',
      details: [
        { label: 'Meses', value: this.textoMeses(d.pendientes) },
        { label: 'Total', value: `$ ${d.totalPendiente.toFixed(2)}` },
      ],
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '520px' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.pagar(id, idEmpresa);
      });
  }

  private pagar(id: number, idEmpresa: number): void {
    this.pagando.set(true);
    this.errorPago.set(null);
    this.resultadoPago.set(null);
    this.pgpc.pagarRetenidos(id, idEmpresa).subscribe((resp) => {
      this.pagando.set(false);
      if (resp.exito && resp.resultado) {
        this.resultadoPago.set(resp.resultado);
        this.mensajePago.set(resp.mensaje ?? null);
      } else {
        this.errorPago.set(resp.mensaje || 'No se pudo pagar las pensiones retenidas.');
      }
      this.consultar(id);
    });
  }
}
