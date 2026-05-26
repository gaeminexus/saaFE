import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleEjecucionReporte } from '../model/detalle-ejecucion-reporte';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class DetalleEjecucionReporteService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleEjecucionReporte[] | null> {
    const url = `${ServiciosRpr.RS_EJRD}/getAll`;
    return this.http.get<DetalleEjecucionReporte[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<DetalleEjecucionReporte | null> {
    const url = `${ServiciosRpr.RS_EJRD}/getId/${id}`;
    return this.http.get<DetalleEjecucionReporte>(url).pipe(catchError(this.handleError));
  }

  getByEjecucion(idEjecucion: number): Observable<DetalleEjecucionReporte[] | null> {
    const url = `${ServiciosRpr.RS_EJRD}/getByEjecucion/${idEjecucion}`;
    return this.http.get<DetalleEjecucionReporte[]>(url).pipe(catchError(this.handleError));
  }

  getConNovedades(idEjecucion: number): Observable<DetalleEjecucionReporte[] | null> {
    const url = `${ServiciosRpr.RS_EJRD}/getConNovedades/${idEjecucion}`;
    return this.http.get<DetalleEjecucionReporte[]>(url).pipe(catchError(this.handleError));
  }

  add(datos: DetalleEjecucionReporte): Observable<DetalleEjecucionReporte | null> {
    return this.http
      .post<DetalleEjecucionReporte>(ServiciosRpr.RS_EJRD, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: DetalleEjecucionReporte): Observable<DetalleEjecucionReporte | null> {
    return this.http
      .put<DetalleEjecucionReporte>(ServiciosRpr.RS_EJRD, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleEjecucionReporte | null> {
    const url = `${ServiciosRpr.RS_EJRD}/${id}`;
    return this.http
      .delete<DetalleEjecucionReporte>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<DetalleEjecucionReporte[] | null> {
    const url = `${ServiciosRpr.RS_EJRD}/selectByCriteria`;
    return this.http
      .post<DetalleEjecucionReporte[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
