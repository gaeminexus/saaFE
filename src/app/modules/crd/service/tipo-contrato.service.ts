import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoContrato } from '../model/tipo-contrato';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class TipoContratoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TipoContrato[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_TPCN}${wsGetById}`;
    return this.http.get<TipoContrato[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoContrato | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TPCN}${wsGetById}${id}`;
    return this.http.get<TipoContrato>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TipoContrato | null> {
    return this.http.post<TipoContrato>(ServiciosCrd.RS_TPCN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TipoContrato | null> {
    return this.http.put<TipoContrato>(ServiciosCrd.RS_TPCN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoContrato[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TPCN}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TipoContrato | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_TPCN}${wsEndpoint}`;
    return this.http.delete<TipoContrato>(url, this.httpOptions).pipe(
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
