import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { Liquidacion } from '../model/Liquidacion';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class LiquidacionService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Liquidacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_LQDC}${wsGetById}`;
    return this.http.get<Liquidacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Liquidacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_LQDC}${wsGetById}${id}`;
    return this.http.get<Liquidacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Liquidacion | null> {
    return this.http.post<Liquidacion>(ServiciosRhh.RS_LQDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Liquidacion | null> {
    return this.http.put<Liquidacion>(ServiciosRhh.RS_LQDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Liquidacion[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_LQDC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Liquidacion | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_LQDC}${wsEndpoint}`;
    return this.http.delete<Liquidacion>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}
