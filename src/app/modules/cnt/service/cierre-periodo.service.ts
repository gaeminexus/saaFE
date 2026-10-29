import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { EstadoCierrePeriodo, EstadoPeriodo, HistorialCierrePeriodo, Periodo } from '../model/periodo';
import { ServiciosCnt } from './ws-cnt';

/** Datos de auditoría que exigen cerrar / reabrir (query params del backend). */
export interface DatosCierre {
  usuario: string;
  ip?: string | null;
  motivo: string;
}

/**
 * C17 — Cierre y reapertura del período contable y bitácora de cierres.
 *
 * Contrato: saaBE docs/logica-negocio/cnt/CIERRES-BLOQUEANTES.md §4. Los errores de negocio llegan como 400
 * con el mensaje del backend (prefijos `PERIODO_CERRADO`, `CIERRE_FUERA_DE_ORDEN`, `CARTERA_CERRADA`...):
 * se propagan como texto para mostrarlos tal cual.
 */
@Injectable({ providedIn: 'root' })
export class CierrePeriodoService {
  private http = inject(HttpClient);
  private readonly base = ServiciosCnt.RS_PRDO;

  /** GET /prdo/estado/{idEmpresa}/{anio}/{mes} */
  estado(idEmpresa: number, anio: number, mes: number): Observable<EstadoCierrePeriodo> {
    return this.http
      .get<EstadoCierrePeriodo>(`${this.base}/estado/${idEmpresa}/${anio}/${mes}`)
      .pipe(catchError(this.aTexto));
  }

  /** POST /prdo/cerrar?idEmpresa&anio&mes&usuario&ip&motivo */
  cerrar(idEmpresa: number, anio: number, mes: number, datos: DatosCierre): Observable<EstadoCierrePeriodo> {
    return this.http
      .post<EstadoCierrePeriodo>(`${this.base}/cerrar`, null, { params: this.params(idEmpresa, anio, mes, datos) })
      .pipe(catchError(this.aTexto));
  }

  /** POST /prdo/reabrir?idEmpresa&anio&mes&usuario&ip&motivo */
  reabrir(idEmpresa: number, anio: number, mes: number, datos: DatosCierre): Observable<EstadoCierrePeriodo> {
    return this.http
      .post<EstadoCierrePeriodo>(`${this.base}/reabrir`, null, { params: this.params(idEmpresa, anio, mes, datos) })
      .pipe(catchError(this.aTexto));
  }

  /** GET /prdo/bitacora/{idEmpresa}?tipo= (saaBE rama cuadre/c17-fe-soporte). */
  bitacora(idEmpresa: number, tipo?: 'CONTABLE' | 'CARTERA'): Observable<HistorialCierrePeriodo[]> {
    let params = new HttpParams();
    if (tipo) params = params.set('tipo', tipo);
    return this.http
      .get<HistorialCierrePeriodo[]>(`${this.base}/bitacora/${idEmpresa}`, { params })
      .pipe(catchError(this.aTexto));
  }

  private params(idEmpresa: number, anio: number, mes: number, datos: DatosCierre): HttpParams {
    let p = new HttpParams()
      .set('idEmpresa', idEmpresa)
      .set('anio', anio)
      .set('mes', mes)
      .set('usuario', datos.usuario)
      .set('motivo', datos.motivo);
    if (datos.ip) p = p.set('ip', datos.ip);
    return p;
  }

  private aTexto = (error: HttpErrorResponse): Observable<never> =>
    throwError(() => mensajeDeError(error, 'Error al comunicarse con el servidor.'));
}

/**
 * Convierte una fecha del backend a `Date`: arreglo Jackson `[y, m, d, h, mi, s, ns]`, texto ISO (con o sin
 * `[UTC]`) o milisegundos. Devuelve null si no se puede interpretar.
 */
export function fechaDeBackend(valor: any): Date | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  if (Array.isArray(valor)) {
    if (valor.length < 3) return null;
    const [y, m, d, h = 0, mi = 0, s = 0] = valor;
    return new Date(y, m - 1, d, h, mi, s);
  }
  if (typeof valor === 'number') return new Date(valor);
  if (typeof valor === 'string') {
    const limpio = valor.replace(/\[.*\]$/, '');
    // "yyyy-MM-dd" solo: como fecha local, no UTC (si no, en Ecuador cae el día anterior).
    const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpio);
    if (soloFecha) return new Date(+soloFecha[1], +soloFecha[2] - 1, +soloFecha[3]);
    const f = new Date(limpio);
    return isNaN(f.getTime()) ? null : f;
  }
  return null;
}

/** `dd/MM/yyyy` o `dd/MM/yyyy HH:mm` de una fecha del backend; '—' si no hay. */
export function formatoFecha(valor: any, conHora = false): string {
  const f = fechaDeBackend(valor);
  if (!f) return '—';
  const dd = String(f.getDate()).padStart(2, '0');
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  const base = `${dd}/${mm}/${f.getFullYear()}`;
  return conHora
    ? `${base} ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`
    : base;
}

/** `yyyy-MM-dd` local (lo que espera `fechaReverso`). */
export function fechaIso(f: Date): string {
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

/** Período CERRADO para contabilidad: PRDOCNCR = 1 o el estado legado 4 (misma regla que el backend). */
export function periodoCerrado(p: Periodo): boolean {
  return p.cerradoContable === 1 || p.estado === EstadoPeriodo.CERRADO;
}

/** Nombre del mes 1..12. */
export function nombreMes(mes: number): string {
  return (
    ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][
      mes - 1
    ] ?? `Mes ${mes}`
  );
}
