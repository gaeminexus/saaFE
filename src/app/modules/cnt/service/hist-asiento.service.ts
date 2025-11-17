import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HistAsiento } from '../model/hist-asiento';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class HistAsientoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<HistAsiento[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_ASNH}${wsGetById}`;
    return this.http.get<HistAsiento[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<HistAsiento | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_ASNH}${wsGetById}${id}`;
    return this.http.get<HistAsiento>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<HistAsiento | null> {
    return this.http.post<HistAsiento>(ServiciosCnt.RS_ASNH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<HistAsiento | null> {
    return this.http.put<HistAsiento>(ServiciosCnt.RS_ASNH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<HistAsiento[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_ASNH}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<HistAsiento | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_ASNH}${wsGetById}`;
    return this.http.delete<HistAsiento>(url, this.httpOptions).pipe(
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
