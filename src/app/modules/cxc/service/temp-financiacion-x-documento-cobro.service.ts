import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { TempFinanciacionXDocumentoCobro } from '../model/temp-financiacion-x-documento-cobro';


@Injectable({
  providedIn: 'root'
})
export class TempFinanciacionXDocumentoCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempFinanciacionXDocumentoCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_TFDC}${wsGetById}`;
    return this.http.get<TempFinanciacionXDocumentoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempFinanciacionXDocumentoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_TFDC}${wsGetById}${id}`;
    return this.http.get<TempFinanciacionXDocumentoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempFinanciacionXDocumentoCobro | null> {
    return this.http.post<TempFinanciacionXDocumentoCobro>(ServiciosCxc.RS_TFDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempFinanciacionXDocumentoCobro | null> {
    return this.http.put<TempFinanciacionXDocumentoCobro>(ServiciosCxc.RS_TFDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempFinanciacionXDocumentoCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_TFDC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempFinanciacionXDocumentoCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_TFDC}${wsEndpoint}`;
    return this.http.delete<TempFinanciacionXDocumentoCobro>(url, this.httpOptions).pipe(
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
