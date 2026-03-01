import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { MayorAnalitico } from '../model/mayor-analitico';
import { DetalleMayorAnalitico } from '../model/detalle-mayor-analitico';
import { ParametrosMayorAnalitico, RespuestaMayorAnalitico } from '../model/reporte-contable.model';
import { ServiciosCnt } from './ws-cnt';

@Injectable({ providedIn: 'root' })
export class ReporteMyanService {

  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * POST /SaaBE/api/cnt/myan/generarReporte
   * Genera el reporte de mayor analítico y retorna el secuencialReporte.
   */
  generarReporte(params: ParametrosMayorAnalitico): Observable<RespuestaMayorAnalitico | null> {
    const url = `${ServiciosCnt.RS_MYAN}/generarReporte`;
    return this.http.post<RespuestaMayorAnalitico>(url, params, this.httpOptions).pipe(
      catchError(this.handleError<RespuestaMayorAnalitico>())
    );
  }

  /**
   * GET /SaaBE/api/cnt/myan/resultado/{secuencial}
   * Obtiene las cabeceras (cuentas) del reporte generado.
   */
  obtenerCabeceras(secuencial: number): Observable<MayorAnalitico[] | null> {
    const url = `${ServiciosCnt.RS_MYAN}/resultado/${secuencial}`;
    return this.http.get<MayorAnalitico[]>(url).pipe(
      catchError(this.handleErrorLista<MayorAnalitico>())
    );
  }

  /**
   * GET /SaaBE/api/cnt/myan/detalle/{idMayorAnalitico}
   * Obtiene los movimientos (detalle) de una cabecera específica.
   */
  obtenerDetalles(idMayorAnalitico: number): Observable<DetalleMayorAnalitico[] | null> {
    const url = `${ServiciosCnt.RS_MYAN}/detalle/${idMayorAnalitico}`;
    return this.http.get<DetalleMayorAnalitico[]>(url).pipe(
      catchError(this.handleErrorLista<DetalleMayorAnalitico>())
    );
  }

  /**
   * DELETE /SaaBE/api/cnt/myan/{secuencial}
   * Elimina los registros temporales del reporte generado.
   */
  eliminarReporte(secuencial: number): Observable<any> {
    const url = `${ServiciosCnt.RS_MYAN}/${secuencial}`;
    return this.http.delete(url, this.httpOptions).pipe(
      catchError(() => of(null))
    );
  }

  // ── Manejo de errores ──────────────────────────────────────────────────────

  private handleError<T>() {
    return (error: HttpErrorResponse): Observable<null> => {
      if (+error.status === 200 || +error.status === 201) return of(null);
      return of(null);
    };
  }

  private handleErrorLista<T>() {
    return (error: HttpErrorResponse): Observable<T[]> => {
      return of([]);
    };
  }
}
