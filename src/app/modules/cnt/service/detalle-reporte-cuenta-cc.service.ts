import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleReporteCuentaCC } from '../model/detalle-reporte-cuenta-cc';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class DetalleReporteCuentaCcService {


  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetalleReporteCuentaCC[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_RDTC}${wsGetById}`;
    return this.http.get<DetalleReporteCuentaCC[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetalleReporteCuentaCC | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_RDTC}${wsGetById}${id}`;
    return this.http.get<DetalleReporteCuentaCC>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<DetalleReporteCuentaCC | null> {
    return this.http.post<DetalleReporteCuentaCC>(ServiciosCnt.RS_RDTC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<DetalleReporteCuentaCC | null> {
    return this.http.put<DetalleReporteCuentaCC>(ServiciosCnt.RS_RDTC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleReporteCuentaCC[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_RDTC}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<DetalleReporteCuentaCC | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_RDTC}${wsGetById}`;
    return this.http.delete<DetalleReporteCuentaCC>(url, this.httpOptions).pipe(
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
