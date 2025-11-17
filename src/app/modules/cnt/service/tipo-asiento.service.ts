import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoAsiento } from '../model/tipo-asiento';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class TipoAsientoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TipoAsiento[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_PLNT}${wsGetById}`;
    return this.http.get<TipoAsiento[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoAsiento | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_PLNT}${wsGetById}${id}`;
    return this.http.get<TipoAsiento>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<TipoAsiento | null> {
    return this.http.post<TipoAsiento>(ServiciosCnt.RS_PLNT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<TipoAsiento | null> {
    return this.http.put<TipoAsiento>(ServiciosCnt.RS_PLNT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoAsiento[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_PLNT}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<TipoAsiento | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_PLNT}${wsGetById}`;
    return this.http.delete<TipoAsiento>(url, this.httpOptions).pipe(
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
