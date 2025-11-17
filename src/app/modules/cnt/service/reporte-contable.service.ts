import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ReporteContable } from '../model/reporte-contable';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class ReporteContableService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ReporteContable[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_RPRT}${wsGetById}`;
    return this.http.get<ReporteContable[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ReporteContable | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_RPRT}${wsGetById}${id}`;
    return this.http.get<ReporteContable>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<ReporteContable | null> {
    return this.http.post<ReporteContable>(ServiciosCnt.RS_RPRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<ReporteContable | null> {
    return this.http.put<ReporteContable>(ServiciosCnt.RS_RPRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ReporteContable[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_RPRT}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<ReporteContable | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_RPRT}${wsGetById}`;
    return this.http.delete<ReporteContable>(url, this.httpOptions).pipe(
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
