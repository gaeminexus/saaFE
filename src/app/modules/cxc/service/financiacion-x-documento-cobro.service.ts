import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { FinanciacionXDocumentoCobro } from '../model/financiacion-x-documento-cobro';


@Injectable({
  providedIn: 'root'
})
export class FinanciacionXDocumentoCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<FinanciacionXDocumentoCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_FXDC}${wsGetById}`;
    return this.http.get<FinanciacionXDocumentoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<FinanciacionXDocumentoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_FXDC}${wsGetById}${id}`;
    return this.http.get<FinanciacionXDocumentoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<FinanciacionXDocumentoCobro | null> {
    return this.http.post<FinanciacionXDocumentoCobro>(ServiciosCxc.RS_FXDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<FinanciacionXDocumentoCobro | null> {
    return this.http.put<FinanciacionXDocumentoCobro>(ServiciosCxc.RS_FXDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<FinanciacionXDocumentoCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_FXDC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<FinanciacionXDocumentoCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_FXDC}${wsEndpoint}`;
    return this.http.delete<FinanciacionXDocumentoCobro>(url, this.httpOptions).pipe(
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
