import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ReporteCuentaCC } from '../model/reporte-cuenta-cc';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class ReporteCuentaCcService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ReporteCuentaCC[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_RCNC}${wsGetById}`;
    return this.http.get<ReporteCuentaCC[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ReporteCuentaCC | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_RCNC}${wsGetById}${id}`;
    return this.http.get<ReporteCuentaCC>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<ReporteCuentaCC | null> {
    return this.http.post<ReporteCuentaCC>(ServiciosCnt.RS_RCNC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<ReporteCuentaCC | null> {
    return this.http.put<ReporteCuentaCC>(ServiciosCnt.RS_RCNC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ReporteCuentaCC[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_RCNC}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<ReporteCuentaCC | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_RCNC}${wsGetById}`;
    return this.http.delete<ReporteCuentaCC>(url, this.httpOptions).pipe(
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
