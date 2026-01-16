import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Contrato } from '../model/Contrato';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class ContratoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Contrato[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_CNTR}${wsGetById}`;
    return this.http.get<Contrato[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Contrato | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_CNTR}${wsGetById}${id}`;
    return this.http.get<Contrato>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Contrato | null> {
    return this.http.post<Contrato>(ServiciosRhh.RS_CNTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Contrato | null> {
    return this.http.put<Contrato>(ServiciosRhh.RS_CNTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Contrato[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_CNTR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Contrato | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_CNTR}${wsEndpoint}`;
    return this.http.delete<Contrato>(url, this.httpOptions).pipe(
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

