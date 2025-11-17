import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MatchCuenta } from '../model/match-cuenta';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class MatchCuentaService {


  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<MatchCuenta[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_MTCH}${wsGetById}`;
    return this.http.get<MatchCuenta[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<MatchCuenta | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_MTCH}${wsGetById}${id}`;
    return this.http.get<MatchCuenta>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<MatchCuenta | null> {
    return this.http.post<MatchCuenta>(ServiciosCnt.RS_MTCH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<MatchCuenta | null> {
    return this.http.put<MatchCuenta>(ServiciosCnt.RS_MTCH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<MatchCuenta[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_MTCH}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<MatchCuenta | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_MTCH}${wsGetById}`;
    return this.http.delete<MatchCuenta>(url, this.httpOptions).pipe(
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
