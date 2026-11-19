import { HttpResponse } from '@angular/common/http';

/** Un archivo listo para entregar al navegador (o, cuando haya librería, para meter en un .zip). */
export interface ArchivoReporte {
  nombre: string;
  blob: Blob;
}

/** Nombre del archivo del encabezado `Content-Disposition`, o el alternativo. */
export function nombreDeRespuesta(resp: HttpResponse<Blob>, alternativo: string): string {
  const cd = resp.headers.get('Content-Disposition') ?? '';
  const m = /filename="?([^";]+)"?/i.exec(cd);
  return m ? m[1] : alternativo;
}

/** Último día del mes como `Date` local. */
export function ultimoDiaDelMes(anio: number, mes: number): Date {
  return new Date(anio, mes, 0);
}

/** aaaa-mm-dd (lo que esperan los `LocalDate` del backend). */
export function isoFecha(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** ddMMaaaa del último día del mes (sufijo de los nombres de la Superintendencia). */
export function corteParaNombre(anio: number, mes: number): string {
  const d = ultimoDiaDelMes(anio, mes).getDate();
  return `${String(d).padStart(2, '0')}${String(mes).padStart(2, '0')}${anio}`;
}

/**
 * CSV para Excel en español: separador `;`, BOM UTF-8, decimales con punto y 2 cifras (mismas reglas que
 * `ExportService`), CRLF entre filas.
 */
export function csvDeFilas(filas: (string | number | null | undefined)[][]): Blob {
  const celda = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? v.toFixed(2) : '0.00';
    const s = String(v);
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texto = filas.map((f) => f.map(celda).join(';')).join('\r\n');
  return new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' });
}
