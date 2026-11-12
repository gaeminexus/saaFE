import { Component, inject, input, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map, switchMap } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { GarantePrestamo } from '../../model/garante-prestamo';
import { ComprobanteCobroService } from '../../service/comprobante-cobro.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';

export type FuenteAportes = 'deudor' | 'garante';

/**
 * Selector «Aportes del deudor | Aportes del garante {nombre}» con la autorización firmada del
 * garante (obligatoria con aportes del garante), para los diálogos de Cobros personales
 * (DISENO-PAGO-CON-APORTES-DEL-GARANTE §G6). Solo se muestra cuando el préstamo tiene un garante
 * activo partícipe; el diálogo que lo usa decide de dónde salen los saldos y qué envía.
 */
@Component({
  selector: 'app-fuente-aportes-garante',
  standalone: true,
  imports: [MaterialFormModule],
  template: `
    @if (garante(); as g) {
      <div class="fag">
        <mat-radio-group aria-label="Aportes de" [value]="fuente()" (change)="fuenteChange.emit($event.value)">
          <mat-radio-button value="deudor">Aportes del deudor</mat-radio-button>
          <mat-radio-button value="garante">Aportes del garante {{ g.nombre }}</mat-radio-button>
        </mat-radio-group>

        @if (fuente() === 'garante') {
          <p class="fag-nota">
            <b>Autorización firmada del garante (obligatoria).</b> PDF o imagen. Sin este archivo no se puede confirmar.
          </p>
          <input type="file" [accept]="aceptaArchivo" (change)="alElegir($event)" />
          @if (archivo(); as a) {
            <span>Adjunto: {{ a.name }} <button mat-button type="button" (click)="archivoChange.emit(null)">Quitar</button></span>
          }
          @if (error) { <p class="fag-error">{{ error }}</p> }
        }
      </div>
    }
  `,
  styles: [`
    .fag { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 12px; }
    .fag-nota { margin: 4px 0 0; font-size: 0.86rem; }
    .fag-error { margin: 0; color: #c62828; font-size: 0.86rem; }
  `],
})
export class FuenteAportesGaranteComponent {
  private comprobantes = inject(ComprobanteCobroService);

  garante = input<GarantePrestamo | null>(null);
  fuente = input<FuenteAportes>('deudor');
  archivo = input<File | null>(null);
  fuenteChange = output<FuenteAportes>();
  archivoChange = output<File | null>();

  readonly aceptaArchivo = this.comprobantes.extensionesAceptadas;
  error: string | null = null;

  alElegir(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) return;
    this.error = this.comprobantes.problemaDelArchivo(archivo);
    this.archivoChange.emit(this.error ? null : archivo);
  }
}

/**
 * Confirmación explícita antes de pagar con aportes del garante (§G3) más el aviso de comprometido
 * (§G5, `GET /prst/compromisoGarante`). El aviso NO detiene el pago; si la consulta falla, se
 * confirma igual sin aviso. Emite `true` si el operador confirma.
 */
export function confirmarPagoConGarante(
  dialog: MatDialog,
  servicio: OperacionesPagoPrestamoService,
  p: { garante: GarantePrestamo; monto: number; tituloPrestamo: string; deudor: string }
): Observable<boolean> {
  const monto = '$' + p.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const prestamo = p.tituloPrestamo.replace(/^Préstamo/, 'préstamo');
  return servicio.compromisoGarante(p.garante.codigo as number, p.monto).pipe(
    switchMap((compromiso) => {
      const data: ConfirmDialogData = {
        title: 'Pagar con aportes del garante',
        message: `Se descontarán ${monto} de las cuentas individuales de ${p.garante.nombre} para pagar el ${prestamo} de ${p.deudor}.`,
        confirmText: 'Descontar y pagar',
        type: 'warning',
        details: compromiso?.quedaDescubierto && compromiso.mensaje
          ? [{ label: 'Aviso', value: compromiso.mensaje }]
          : undefined,
      };
      return dialog.open(ConfirmDialogComponent, { data, width: '520px' }).afterClosed().pipe(map((r) => !!r));
    })
  );
}
