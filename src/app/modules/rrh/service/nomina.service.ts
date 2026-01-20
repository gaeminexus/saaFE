import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { Nomina } from '../model/nomina';

@Injectable({
  providedIn: 'root',
})
export class NominaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Nomina[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_NMNA}${wsGetById}`;
    return this.http.get<Nomina[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Nomina | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_NMNA}${wsGetById}${id}`;
    return this.http.get<Nomina>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Nomina | null> {
    return this.http.post<Nomina>(ServiciosRhh.RS_NMNA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Nomina | null> {
    return this.http.put<Nomina>(ServiciosRhh.RS_NMNA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Nomina[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_NMNA}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Nomina | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_NMNA}${wsEndpoint}`;
    return this.http.delete<Nomina>(url, this.httpOptions).pipe(
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
