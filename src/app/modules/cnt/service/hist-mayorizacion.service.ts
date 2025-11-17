import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HistMayorizacion } from '../model/hist-mayorizacion';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class HistMayorizacionService {


  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<HistMayorizacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_MYRH}${wsGetById}`;
    return this.http.get<HistMayorizacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<HistMayorizacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_MYRH}${wsGetById}${id}`;
    return this.http.get<HistMayorizacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<HistMayorizacion | null> {
    return this.http.post<HistMayorizacion>(ServiciosCnt.RS_MYRH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<HistMayorizacion | null> {
    return this.http.put<HistMayorizacion>(ServiciosCnt.RS_MYRH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<HistMayorizacion[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_MYRH}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<HistMayorizacion | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_MYRH}${wsGetById}`;
    return this.http.delete<HistMayorizacion>(url, this.httpOptions).pipe(
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
