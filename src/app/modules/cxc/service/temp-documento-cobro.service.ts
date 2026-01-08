import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { TempDocumentoCobro } from '../model/temp-documento-cobro';


@Injectable({
  providedIn: 'root'
})
export class TempDocumentoCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempDocumentoCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_TDCC}${wsGetById}`;
    return this.http.get<TempDocumentoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempDocumentoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_TDCC}${wsGetById}${id}`;
    return this.http.get<TempDocumentoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempDocumentoCobro | null> {
    return this.http.post<TempDocumentoCobro>(ServiciosCxc.RS_TDCC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempDocumentoCobro | null> {
    return this.http.put<TempDocumentoCobro>(ServiciosCxc.RS_TDCC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempDocumentoCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_TDCC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempDocumentoCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_TDCC}${wsEndpoint}`;
    return this.http.delete<TempDocumentoCobro>(url, this.httpOptions).pipe(
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
