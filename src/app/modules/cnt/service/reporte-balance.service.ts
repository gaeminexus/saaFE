import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TemporalReporte } from '../model/temporal-reporte';
import { ParametrosBalance, RespuestaBalance } from '../model/reporte-contable.model';
import { ServiciosCnt } from './ws-cnt';

@Injectable({ providedIn: 'root' })
export class ReporteBalanceService {

  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * POST /SaaBE/api/cnt/tempReportes/generarBalance
   * Genera el balance contable y retorna el idEjecucion.
   */
  generarBalance(params: ParametrosBalance): Observable<RespuestaBalance | null> {
    const url = `${ServiciosCnt.RS_DTMT}/generarBalance`;
    return this.http.post<RespuestaBalance>(url, params, this.httpOptions).pipe(
      catchError(this.handleError<RespuestaBalance>())
    );
  }

  /**
   * GET /dtmt/resultado/{idEjecucion}
   * Obtiene los registros del balance generado.
   */
  obtenerBalance(idEjecucion: number): Observable<TemporalReporte[] | null> {
    const url = `${ServiciosCnt.RS_DTMT}/resultado/${idEjecucion}`;
    return this.http.get<TemporalReporte[]>(url).pipe(
      catchError(this.handleErrorLista<TemporalReporte>())
    );
  }

  /**
   * DELETE /SaaBE/api/cnt/tempReportes/{idEjecucion}
   * Elimina los registros temporales del balance generado.
   */
  eliminarBalance(idEjecucion: number): Observable<any> {
    const url = `${ServiciosCnt.RS_DTMT}/${idEjecucion}`;
    return this.http.delete(url, this.httpOptions).pipe(
      catchError(() => of(null))
    );
  }

  // ── Manejo de errores ──────────────────────────────────────────────────────

  /**
   * Pase a producción §2: el error ya no se traga. El backend responde 400 con `{mensaje}` (por
   * ejemplo `REPORTE_MES_NO_CERRADO`) y la pantalla lo muestra con `mensajeDeError`.
   */
  private handleError<T>() {
    return (error: HttpErrorResponse): Observable<null> =>
      +error?.status === 200 ? of(null) : throwError(() => error);
  }

  private handleErrorLista<T>() {
    return (_error: HttpErrorResponse): Observable<T[]> => of([]);
  }
}
