import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HistDetalleAsiento } from '../model/hist-detalle-asiento';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class HistDetalleAsientoService {


  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<HistDetalleAsiento[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_DTAH}${wsGetById}`;
    return this.http.get<HistDetalleAsiento[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<HistDetalleAsiento | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_DTAH}${wsGetById}${id}`;
    return this.http.get<HistDetalleAsiento>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<HistDetalleAsiento | null> {
    return this.http.post<HistDetalleAsiento>(ServiciosCnt.RS_DTAH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<HistDetalleAsiento | null> {
    return this.http.put<HistDetalleAsiento>(ServiciosCnt.RS_DTAH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<HistDetalleAsiento[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_DTAH}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<HistDetalleAsiento | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_DTAH}${wsGetById}`;
    return this.http.delete<HistDetalleAsiento>(url, this.httpOptions).pipe(
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
