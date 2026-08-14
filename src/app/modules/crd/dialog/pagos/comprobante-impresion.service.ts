import { Injectable } from '@angular/core';

/**
 * Generador del comprobante imprimible de las operaciones de pago.
 *
 * Vive fuera de los diálogos porque lo comparten dos pantallas que tienen que emitir EXACTAMENTE
 * el mismo documento:
 * - `ReciboOperacionDialogComponent` — el comprobante que sale al confirmar un cobro en
 *   `cobros-personales`.
 * - `PrestamoPagosDialogComponent` — la reimpresión de los pagos ya registrados de una cuota,
 *   desde el detalle del préstamo en `participe-dash`.
 *
 * Se imprime en una ventana aparte en lugar de con `@media print` sobre el diálogo: el overlay de
 * Material deja el resto de la aplicación en el DOM y aislarlo con CSS de impresión es frágil.
 * Generar el documento resuelve además el corte de página de la tabla.
 */

/** Fila del desglose. Los seis conceptos suman `total`, en el orden de prelación del backend. */
export interface FilaComprobante {
  /** Primera columna: número de cuota en el recibo, fecha del pago en la reimpresión. */
  concepto: string;
  /** Segunda columna. Texto plano; en el recibo es la transición "Pendiente → Pagada". */
  estado?: string;
  desgravamen: number;
  mora: number;
  interesVencido: number;
  interes: number;
  capital: number;
  seguro: number;
  total: number;
}

/** Bloque de pares etiqueta/valor que se imprime como tabla de dos columnas. */
export interface BloqueComprobante {
  titulo: string;
  filas: { label: string; valor: string }[];
}

export interface DatosComprobante {
  titulo: string;
  subtitulo: string;
  /** Cabecera: partícipe, N° de operación, fecha, comprobante adjunto... */
  datos: { label: string; valor: string }[];
  mensaje?: string;
  /** Rótulo de la primera columna del desglose. */
  encabezadoConcepto?: string;
  /** Rótulo de la segunda columna del desglose. */
  encabezadoEstado?: string;
  /** Nota que se imprime encima del desglose. */
  notaTabla?: string;
  filas: FilaComprobante[];
  /** Tablas auxiliares de etiqueta/valor (p. ej. la composición pactada de la cuota). */
  bloques?: BloqueComprobante[];
  /** Aportes debitados al partícipe para cubrir la operación. */
  aportes?: { nombre: string; valor: number }[];
}

export function formatMonedaComprobante(n: number | null | undefined): string {
  return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

@Injectable({ providedIn: 'root' })
export class ComprobanteImpresionService {
  imprimir(datos: DatosComprobante): void {
    const ventana = window.open('', '_blank', 'width=900,height=700');
    if (!ventana) return;
    ventana.document.write(this.html(datos));
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  html(datos: DatosComprobante): string {
    const esc = (t: unknown) =>
      String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
    const m = formatMonedaComprobante;

    const totales = datos.filas.reduce(
      (acc, f) => ({
        desgravamen: acc.desgravamen + (f.desgravamen ?? 0),
        mora: acc.mora + (f.mora ?? 0),
        interesVencido: acc.interesVencido + (f.interesVencido ?? 0),
        interes: acc.interes + (f.interes ?? 0),
        capital: acc.capital + (f.capital ?? 0),
        seguro: acc.seguro + (f.seguro ?? 0),
        total: acc.total + (f.total ?? 0),
      }),
      { desgravamen: 0, mora: 0, interesVencido: 0, interes: 0, capital: 0, seguro: 0, total: 0 }
    );

    const filas = datos.filas
      .map(
        (f) => `<tr>
          <td>${esc(f.concepto)}</td>
          <td>${esc(f.estado ?? '')}</td>
          <td class="n">${esc(m(f.desgravamen))}</td>
          <td class="n">${esc(m(f.mora))}</td>
          <td class="n">${esc(m(f.interesVencido))}</td>
          <td class="n">${esc(m(f.interes))}</td>
          <td class="n">${esc(m(f.capital))}</td>
          <td class="n">${esc(m(f.seguro))}</td>
          <td class="n"><b>${esc(m(f.total))}</b></td>
        </tr>`
      )
      .join('');

    const tablaDesglose = datos.filas.length
      ? `${datos.notaTabla ? `<h3>${esc(datos.notaTabla)}</h3>` : ''}
         <table>
          <thead><tr>
            <th>${esc(datos.encabezadoConcepto ?? 'Cuota')}</th><th>${esc(datos.encabezadoEstado ?? 'Estado')}</th>
            <th class="n">Desgrav.</th><th class="n">Mora</th>
            <th class="n">Int. vencido</th><th class="n">Interés</th><th class="n">Capital</th>
            <th class="n">Seguro</th><th class="n">Total</th>
          </tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr>
            <td colspan="2">TOTALES</td>
            <td class="n">${esc(m(totales.desgravamen))}</td>
            <td class="n">${esc(m(totales.mora))}</td>
            <td class="n">${esc(m(totales.interesVencido))}</td>
            <td class="n">${esc(m(totales.interes))}</td>
            <td class="n">${esc(m(totales.capital))}</td>
            <td class="n">${esc(m(totales.seguro))}</td>
            <td class="n">${esc(m(totales.total))}</td>
          </tr></tfoot>
        </table>`
      : '';

    const bloques = (datos.bloques ?? [])
      .filter((b) => b.filas.length)
      .map(
        (b) => `<h3>${esc(b.titulo)}</h3>
         <table>
           <tbody>${b.filas
             .map((f) => `<tr><td>${esc(f.label)}</td><td class="n">${esc(f.valor)}</td></tr>`)
             .join('')}</tbody>
         </table>`
      )
      .join('');

    const tablaAportes = datos.aportes?.length
      ? `<h3>Aportes utilizados</h3>
         <table>
           <thead><tr><th>Tipo de aporte</th><th class="n">Valor</th></tr></thead>
           <tbody>${datos.aportes
             .map((a) => `<tr><td>${esc(a.nombre)}</td><td class="n">${esc(m(a.valor))}</td></tr>`)
             .join('')}</tbody>
           <tfoot><tr><td>TOTAL</td><td class="n">${esc(
             m(datos.aportes.reduce((s, a) => s + (a.valor ?? 0), 0))
           )}</td></tr></tfoot>
         </table>`
      : '';

    const cabecera = datos.datos
      .map((d) => `<div><span>${esc(d.label)}:</span><b>${esc(d.valor)}</b></div>`)
      .join('');

    return `<!doctype html><html lang="es"><head><meta charset="utf-8">
      <title>Comprobante — ${esc(datos.subtitulo)}</title>
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
      <h1>${esc(datos.titulo)}</h1>
      <div class="sub">${esc(datos.subtitulo)}</div>
      <div class="datos">${cabecera}</div>
      ${datos.mensaje ? `<p style="font-size:12px">${esc(datos.mensaje)}</p>` : ''}
      ${tablaDesglose}
      ${bloques}
      ${tablaAportes}
      <div class="pie">ASOPREP-FCPC &middot; Sistema de Administración de Aportes (SAA) &middot; Documento generado desde el sistema.</div>
      </body></html>`;
  }
}
