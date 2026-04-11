import { HttpHeaders, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Entidad } from '../model/entidad';
import {
  EntidadDashboardFiltros,
  EntidadResumenAportesDTO,
  EntidadResumenConsolidadoDTO,
  EntidadResumenEstadoDTO,
  EntidadResumenPrestamosDTO,
} from '../model/entidad-dashboard';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class EntidadService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Entidad[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_ENTD}${wsGetById}`;
    return this.http.get<Entidad[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Entidad | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_ENTD}${wsGetById}${id}`;
    return this.http.get<Entidad>(url).pipe(
      catchError(this.handleError)
    );
  }

  getCoincidencias(nombre: string): Observable<Entidad[] | null> {
    const wsGetById = '/getCoincidencias/';
    const url = `${ServiciosCrd.RS_ENTD}${wsGetById}${nombre}`;
    return this.http.get<Entidad[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getByNombrePetro35(nombre: string): Observable<Entidad[] | null> {
    const wsGetById = '/getByNombrePetro35/';
    const url = `${ServiciosCrd.RS_ENTD}${wsGetById}${nombre}`;
    return this.http.get<Entidad[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Entidad | null> {
    return this.http.post<Entidad>(ServiciosCrd.RS_ENTD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Entidad | null> {
    return this.http.put<Entidad>(ServiciosCrd.RS_ENTD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Entidad[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_ENTD}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private buildDashboardParams(filtros?: EntidadDashboardFiltros): HttpParams {
    let params = new HttpParams();

    if (filtros?.estados) {
      params = params.set('estados', filtros.estados);
    }

    return params;
  }

  getResumenPorEstado(filtros?: EntidadDashboardFiltros): Observable<EntidadResumenEstadoDTO[] | null> {
    const url = `${ServiciosCrd.RS_ENTD}/resumen-por-estado`;
    return this.http.get<EntidadResumenEstadoDTO[]>(url, { params: this.buildDashboardParams(filtros) }).pipe(
      catchError(this.handleError)
    );
  }

  getResumenPrestamosPorEstado(filtros?: EntidadDashboardFiltros): Observable<EntidadResumenPrestamosDTO[] | null> {
    const url = `${ServiciosCrd.RS_ENTD}/resumen-prestamos-por-estado`;
    return this.http.get<EntidadResumenPrestamosDTO[]>(url, { params: this.buildDashboardParams(filtros) }).pipe(
      catchError(this.handleError)
    );
  }

  getResumenAportesPorEstado(filtros?: EntidadDashboardFiltros): Observable<EntidadResumenAportesDTO[] | null> {
    const url = `${ServiciosCrd.RS_ENTD}/resumen-aportes-por-estado`;
    return this.http.get<EntidadResumenAportesDTO[]>(url, { params: this.buildDashboardParams(filtros) }).pipe(
      catchError(this.handleError)
    );
  }

  getResumenConsolidadoPorEstado(
    filtros?: EntidadDashboardFiltros,
  ): Observable<EntidadResumenConsolidadoDTO[] | null> {
    const url = `${ServiciosCrd.RS_ENTD}/resumen-consolidado-por-estado`;
    return this.http
      .get<EntidadResumenConsolidadoDTO[]>(url, { params: this.buildDashboardParams(filtros) })
      .pipe(catchError(this.handleError));
  }

  /** DELETE */
  delete(id: any): Observable<Entidad | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_ENTD}${wsEndpoint}`;
    return this.http.delete<Entidad>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
