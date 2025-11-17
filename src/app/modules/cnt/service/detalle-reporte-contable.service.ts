import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleReporteContable } from '../model/detalle-reporte-contable';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class DetalleReporteContableService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetalleReporteContable[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_DTRP}${wsGetById}`;
    return this.http.get<DetalleReporteContable[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetalleReporteContable | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_DTRP}${wsGetById}${id}`;
    return this.http.get<DetalleReporteContable>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<DetalleReporteContable | null> {
    return this.http.post<DetalleReporteContable>(ServiciosCnt.RS_DTRP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<DetalleReporteContable | null> {
    return this.http.put<DetalleReporteContable>(ServiciosCnt.RS_DTRP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleReporteContable[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_DTRP}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<DetalleReporteContable | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_DTRP}${wsGetById}`;
    return this.http.delete<DetalleReporteContable>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}
