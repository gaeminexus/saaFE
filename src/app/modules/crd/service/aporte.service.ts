import { HttpHeaders, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Aporte } from '../model/aporte';
import {
  AporteDashFiltros,
  AporteKpiDTO,
  AporteResumenTipoDTO,
  AporteTopEntidadDTO,
  AporteTopMovimientoDTO,
} from '../model/aporte-dashboard';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class AporteService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Aporte[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}`;
    return this.http.get<Aporte[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Aporte | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}${id}`;
    return this.http.get<Aporte>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new record */
  add(datos: any): Observable<Aporte | null> {
    return this.http.post<Aporte>(ServiciosCrd.RS_APRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Aporte | null> {
    return this.http.put<Aporte>(ServiciosCrd.RS_APRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Aporte[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete record by ID */
  delete(id: any): Observable<Aporte | null> {
    const wsGetById = '/' + id;
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}`;
    return this.http.delete<Aporte>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // ── Dashboard de aportes ────────────────────────────────────────────────

  /** KPIs globales del dashboard de aportes. */
  getKpisGlobales(filtros?: AporteDashFiltros): Observable<AporteKpiDTO | null> {
    const params = this.buildDashParams(filtros);
    return this.http
      .get<AporteKpiDTO>(`${ServiciosCrd.RS_APRT}/kpis-globales`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Resumen por tipo de aporte (datos para el gráfico de dona). */
  getResumenPorTipo(filtros?: AporteDashFiltros): Observable<AporteResumenTipoDTO[] | null> {
    const params = this.buildDashParams(filtros);
    return this.http
      .get<AporteResumenTipoDTO[]>(`${ServiciosCrd.RS_APRT}/resumen-por-tipo`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Top entidades con mayor impacto por tipo de aporte. */
  getTopEntidades(filtros?: AporteDashFiltros): Observable<AporteTopEntidadDTO[] | null> {
    const params = this.buildDashParams(filtros);
    return this.http
      .get<AporteTopEntidadDTO[]>(`${ServiciosCrd.RS_APRT}/top-entidades`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Top movimientos individuales de aporte. */
  getTopMovimientos(filtros?: AporteDashFiltros): Observable<AporteTopMovimientoDTO[] | null> {
    const params = this.buildDashParams(filtros);
    return this.http
      .get<AporteTopMovimientoDTO[]>(`${ServiciosCrd.RS_APRT}/top-movimientos`, { params })
      .pipe(catchError(this.handleError));
  }

  private buildDashParams(filtros?: AporteDashFiltros): HttpParams {
    let params = new HttpParams();
    if (!filtros) {
      return params;
    }
    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta);
    }
    if (filtros.estadoAporte != null) {
      params = params.set('estadoAporte', filtros.estadoAporte.toString());
    }
    if (filtros.tipoAporteId != null) {
      params = params.set('tipoAporteId', filtros.tipoAporteId.toString());
    }
    if (filtros.topN != null) {
      params = params.set('topN', filtros.topN.toString());
    }
    return params;
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
