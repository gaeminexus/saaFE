import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempFinanciacionXDocumentoPago } from '../model/temp_financiacion_x_documento_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class TempFinanciacionXDocumentoPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempFinanciacionXDocumentoPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_TFDP}${wsGetById}`;
    return this.http.get<TempFinanciacionXDocumentoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempFinanciacionXDocumentoPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_TFDP}${wsGetById}${id}`;
    return this.http.get<TempFinanciacionXDocumentoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempFinanciacionXDocumentoPago | null> {
    return this.http.post<TempFinanciacionXDocumentoPago>(ServiciosCxp.RS_TFDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempFinanciacionXDocumentoPago | null> {
    return this.http.put<TempFinanciacionXDocumentoPago>(ServiciosCxp.RS_TFDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempFinanciacionXDocumentoPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_TFDP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempFinanciacionXDocumentoPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_TFDP}${wsEndpoint}`;
    return this.http.delete<TempFinanciacionXDocumentoPago>(url, this.httpOptions).pipe(
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
