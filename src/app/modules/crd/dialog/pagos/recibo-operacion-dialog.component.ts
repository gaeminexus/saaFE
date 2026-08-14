import { CommonModule } from '@angular/common';
import { Component, HostListener, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import {
  CLASE_ESTADO_CUOTA,
  NOMBRE_ESTADO_CUOTA,
  NOMBRE_ESTADO_PRESTAMO,
  NOMBRE_TIPO_OPERACION,
} from '../../model/pagos/catalogos-pago';
import {
  CuotaAfectada,
  ResultadoAbonoCapital,
  ResultadoPagoCuota,
  ResultadoPrecancelacion,
} from '../../model/pagos/operaciones-pago';
import { MovimientoAporte } from '../../model/pagos/respuesta-pago';

export interface ReciboOperacionData {
  tipo: 'PAGO_MANUAL' | 'PAGO_APORTES' | 'ABONO_CAPITAL' | 'PRECANCELACION' | 'ANULACION';
  /** Encabezado del comprobante, p. ej. "Préstamo #8523 · Crédito Ordinario". */
  tituloPrestamo: string;
  participante?: string;
  /** El `mensaje` que devolvió el backend. */
  mensaje?: string;
  fecha?: string;
  pago?: ResultadoPagoCuota;
  abono?: ResultadoAbonoCapital;
  precancelacion?: ResultadoPrecancelacion;
  movimientosAporte?: MovimientoAporte[];
  /** idTipoAporte → nombre, para rotular los movimientos de aporte. */
  nombresTipoAporte?: Record<number, string>;
  /** Texto libre extra (motivo de anulación, observación...). */
  detalleExtra?: { label: string; valor: string }[];
}

/**
 * Comprobante de una operación de pago ya aplicada: muestra el desglose que devolvió el backend
 * (§4 de la guía) y permite imprimirlo.
 *
 * Los seis campos `aplicado*` de cada cuota suman exactamente `totalAplicado`, y se listan en el
 * orden de prelación con que el backend imputa el dinero: desgravamen → mora → interés vencido →
 * interés → capital → seguro de incendio.
 */
@Component({
  selector: 'app-recibo-operacion-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  templateUrl: './recibo-operacion-dialog.component.html',
  styleUrl: './recibo-operacion-dialog.component.scss',
})
export class ReciboOperacionDialogComponent {
  readonly NOMBRE_TIPO_OPERACION = NOMBRE_TIPO_OPERACION;

  constructor(
    private dialogRef: MatDialogRef<ReciboOperacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReciboOperacionData
  ) {}

  @HostListener('document:keydown.control.p', ['$event'])
  atajoImprimir(evento: Event): void {
    evento.preventDefault();
    this.imprimir();
  }

  get titulo(): string {
    if (this.data.tipo === 'ANULACION') return 'Operación anulada';
    return `${NOMBRE_TIPO_OPERACION[this.data.tipo] ?? 'Operación'} aplicado`;
  }

  get idEvento(): number | null {
    return (
      this.data.pago?.idEvento ??
      this.data.abono?.idEvento ??
      this.data.precancelacion?.idEvento ??
      null
    );
  }

  get cuotas(): CuotaAfectada[] {
    return this.data.pago?.cuotasAfectadas ?? [];
  }

  get movimientos(): MovimientoAporte[] {
    return this.data.movimientosAporte ?? this.data.precancelacion?.movimientosAporte ?? [];
  }

  get totalAportes(): number {
    return this.movimientos.reduce((s, m) => s + Math.abs(m.valor ?? 0), 0);
  }

  /** Totales por columna del desglose, para el pie de la tabla. */
  get totales(): Record<string, number> {
    const claves = [
      'aplicadoDesgravamen',
      'aplicadoMora',
      'aplicadoInteresVencido',
      'aplicadoInteres',
      'aplicadoCapital',
      'aplicadoSeguro',
      'totalAplicado',
    ] as const;
    const acumulado: Record<string, number> = {};
    for (const clave of claves) {
      acumulado[clave] = this.cuotas.reduce((s, c) => s + (c[clave] ?? 0), 0);
    }
    return acumulado;
  }

  nombreEstadoCuota(estado: number): string {
    return NOMBRE_ESTADO_CUOTA[estado] ?? `Estado ${estado}`;
  }

  claseEstadoCuota(estado: number): string {
    return CLASE_ESTADO_CUOTA[estado] ?? 'est-pendiente';
  }

  nombreEstadoPrestamo(estado: number | undefined): string {
    if (estado == null) return '—';
    return NOMBRE_ESTADO_PRESTAMO[estado] ?? `Estado ${estado}`;
  }

  nombreTipoAporte(idTipoAporte: number): string {
    return this.data.nombresTipoAporte?.[idTipoAporte] ?? `Tipo ${idTipoAporte}`;
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  /**
   * Imprime el comprobante en una ventana aparte en lugar de con `@media print` sobre el diálogo:
   * el overlay de Material deja el resto de la aplicación en el DOM y aislarlo con CSS de
   * impresión es frágil. Generar el documento resuelve además el corte de página de la tabla.
   */
  imprimir(): void {
    const ventana = window.open('', '_blank', 'width=900,height=700');
    if (!ventana) return;
    ventana.document.write(this.htmlComprobante());
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  private htmlComprobante(): string {
    const esc = (t: unknown) =>
      String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

    const filas = this.cuotas
      .map(
        (c) => `<tr>
          <td>${esc(c.numeroCuota)}</td>
          <td>${esc(this.nombreEstadoCuota(c.estadoAnterior))} &rarr; ${esc(this.nombreEstadoCuota(c.estadoNuevo))}</td>
          <td class="n">${esc(this.formatMoneda(c.aplicadoDesgravamen))}</td>
          <td class="n">${esc(this.formatMoneda(c.aplicadoMora))}</td>
          <td class="n">${esc(this.formatMoneda(c.aplicadoInteresVencido))}</td>
          <td class="n">${esc(this.formatMoneda(c.aplicadoInteres))}</td>
          <td class="n">${esc(this.formatMoneda(c.aplicadoCapital))}</td>
          <td class="n">${esc(this.formatMoneda(c.aplicadoSeguro))}</td>
          <td class="n"><b>${esc(this.formatMoneda(c.totalAplicado))}</b></td>
        </tr>`
      )
      .join('');

    const tablaCuotas = this.cuotas.length
      ? `<table>
          <thead><tr>
            <th>Cuota</th><th>Estado</th><th class="n">Desgrav.</th><th class="n">Mora</th>
            <th class="n">Int. vencido</th><th class="n">Interés</th><th class="n">Capital</th>
            <th class="n">Seguro</th><th class="n">Total</th>
          </tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr>
            <td colspan="2">TOTALES</td>
            <td class="n">${esc(this.formatMoneda(this.totales['aplicadoDesgravamen']))}</td>
            <td class="n">${esc(this.formatMoneda(this.totales['aplicadoMora']))}</td>
            <td class="n">${esc(this.formatMoneda(this.totales['aplicadoInteresVencido']))}</td>
            <td class="n">${esc(this.formatMoneda(this.totales['aplicadoInteres']))}</td>
            <td class="n">${esc(this.formatMoneda(this.totales['aplicadoCapital']))}</td>
            <td class="n">${esc(this.formatMoneda(this.totales['aplicadoSeguro']))}</td>
            <td class="n">${esc(this.formatMoneda(this.totales['totalAplicado']))}</td>
          </tr></tfoot>
        </table>`
      : '';

    const tablaAportes = this.movimientos.length
      ? `<h3>Aportes utilizados</h3>
         <table>
           <thead><tr><th>Tipo de aporte</th><th class="n">Valor</th></tr></thead>
           <tbody>${this.movimientos
             .map(
               (m) =>
                 `<tr><td>${esc(this.nombreTipoAporte(m.idTipoAporte))}</td><td class="n">${esc(
                   this.formatMoneda(Math.abs(m.valor))
                 )}</td></tr>`
             )
             .join('')}</tbody>
           <tfoot><tr><td>TOTAL</td><td class="n">${esc(this.formatMoneda(this.totalAportes))}</td></tr></tfoot>
         </table>`
      : '';

    const extras = (this.data.detalleExtra ?? [])
      .map((d) => `<div><span>${esc(d.label)}</span><b>${esc(d.valor)}</b></div>`)
      .join('');

    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
      <title>Comprobante — ${esc(this.data.tituloPrestamo)}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1a202c; margin: 28px; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        h3 { font-size: 13px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #4a5568; }
        .sub { color: #718096; font-size: 12px; margin-bottom: 16px; }
        .datos { display: flex; flex-wrap: wrap; gap: 6px 28px; font-size: 12px; margin-bottom: 14px; }
        .datos > div { display: flex; gap: 6px; }
        .datos span { color: #718096; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
        th { background: #edf2f7; text-align: left; padding: 6px; border-bottom: 1px solid #cbd5e0; }
        td { padding: 6px; border-bottom: 1px solid #edf2f7; }
        tfoot td { background: #f7fafc; font-weight: bold; border-top: 2px solid #cbd5e0; }
        .n { text-align: right; }
        .pie { margin-top: 22px; font-size: 10px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        @page { size: A4 landscape; margin: 14mm; }
      </style></head><body>
      <h1>${esc(this.titulo)}</h1>
      <div class="sub">${esc(this.data.tituloPrestamo)}</div>
      <div class="datos">
        ${this.data.participante ? `<div><span>Partícipe:</span><b>${esc(this.data.participante)}</b></div>` : ''}
        ${this.idEvento != null ? `<div><span>N° de operación:</span><b>${esc(this.idEvento)}</b></div>` : ''}
        ${this.data.fecha ? `<div><span>Fecha:</span><b>${esc(this.data.fecha)}</b></div>` : ''}
        ${extras}
      </div>
      ${this.data.mensaje ? `<p style="font-size:12px">${esc(this.data.mensaje)}</p>` : ''}
      ${tablaCuotas}
      ${tablaAportes}
      <div class="pie">ASOPREP-FCPC &middot; Sistema de Administración de Aportes (SAA) &middot; Documento generado desde el sistema.</div>
      </body></html>`;
  }
}
