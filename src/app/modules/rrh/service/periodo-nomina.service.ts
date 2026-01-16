import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { PeriodoNomina } from '../model/periodo-nomina';

@Injectable({
  providedIn: 'root',
})
export class PeriodoPeriodoNominaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<PeriodoNomina[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_PRDN}${wsGetById}`;
    return this.http.get<PeriodoNomina[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<PeriodoNomina | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_PRDN}${wsGetById}${id}`;
    return this.http.get<PeriodoNomina>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<PeriodoNomina | null> {
    return this.http.post<PeriodoNomina>(ServiciosRhh.RS_PRDN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<PeriodoNomina | null> {
    return this.http.put<PeriodoNomina>(ServiciosRhh.RS_PRDN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<PeriodoNomina[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_PRDN}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<PeriodoNomina | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_PRDN}${wsEndpoint}`;
    return this.http.delete<PeriodoNomina>(url, this.httpOptions).pipe(
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
