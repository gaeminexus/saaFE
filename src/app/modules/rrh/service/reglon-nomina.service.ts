import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { ReglonNomina } from '../model/reglon-nomina';

@Injectable({
  providedIn: 'root',
})
export class ReglonNominaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ReglonNomina[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_RNGL}${wsGetById}`;
    return this.http.get<ReglonNomina[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ReglonNomina | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_RNGL}${wsGetById}${id}`;
    return this.http.get<ReglonNomina>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ReglonNomina | null> {
    return this.http.post<ReglonNomina>(ServiciosRhh.RS_RNGL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ReglonNomina | null> {
    return this.http.put<ReglonNomina>(ServiciosRhh.RS_RNGL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ReglonNomina[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_RNGL}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ReglonNomina | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_RNGL}${wsEndpoint}`;
    return this.http.delete<ReglonNomina>(url, this.httpOptions).pipe(
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

