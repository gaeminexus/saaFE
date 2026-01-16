import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { ResumenNomina } from '../model/resumen-nomina';

@Injectable({
  providedIn: 'root',
})
export class ResumenNominaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ResumenNomina[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_RSMN}${wsGetById}`;
    return this.http.get<ResumenNomina[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ResumenNomina | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_RSMN}${wsGetById}${id}`;
    return this.http.get<ResumenNomina>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ResumenNomina | null> {
    return this.http.post<ResumenNomina>(ServiciosRhh.RS_RSMN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ResumenNomina | null> {
    return this.http.put<ResumenNomina>(ServiciosRhh.RS_RSMN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ResumenNomina[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_RSMN}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ResumenNomina | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_RSMN}${wsEndpoint}`;
    return this.http.delete<ResumenNomina>(url, this.httpOptions).pipe(
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

