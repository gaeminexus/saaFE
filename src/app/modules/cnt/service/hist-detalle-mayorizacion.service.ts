import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HistDetalleMayorizacion } from '../model/hist-detalle-mayorizacion';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class HistDetalleMayorizacionService {


  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<HistDetalleMayorizacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_DTMH}${wsGetById}`;
    return this.http.get<HistDetalleMayorizacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<HistDetalleMayorizacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_DTMH}${wsGetById}${id}`;
    return this.http.get<HistDetalleMayorizacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<HistDetalleMayorizacion | null> {
    return this.http.post<HistDetalleMayorizacion>(ServiciosCnt.RS_DTMH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<HistDetalleMayorizacion | null> {
    return this.http.put<HistDetalleMayorizacion>(ServiciosCnt.RS_DTMH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<HistDetalleMayorizacion[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_DTMH}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<HistDetalleMayorizacion | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_DTMH}${wsGetById}`;
    return this.http.delete<HistDetalleMayorizacion>(url, this.httpOptions).pipe(
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
