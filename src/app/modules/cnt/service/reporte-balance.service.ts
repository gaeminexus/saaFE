import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
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

  private handleError<T>() {
    return (_error: HttpErrorResponse): Observable<null> => of(null);
  }

  private handleErrorLista<T>() {
    return (_error: HttpErrorResponse): Observable<T[]> => of([]);
  }
}
