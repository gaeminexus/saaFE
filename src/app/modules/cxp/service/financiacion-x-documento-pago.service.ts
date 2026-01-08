import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { FinanciacionXDocumentoPago } from '../model/financiacion_x_documento_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class FinanciacionXDocumentoPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<FinanciacionXDocumentoPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_FXDP}${wsGetById}`;
    return this.http.get<FinanciacionXDocumentoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<FinanciacionXDocumentoPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_FXDP}${wsGetById}${id}`;
    return this.http.get<FinanciacionXDocumentoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<FinanciacionXDocumentoPago | null> {
    return this.http.post<FinanciacionXDocumentoPago>(ServiciosCxp.RS_FXDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<FinanciacionXDocumentoPago | null> {
    return this.http.put<FinanciacionXDocumentoPago>(ServiciosCxp.RS_FXDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<FinanciacionXDocumentoPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_FXDP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<FinanciacionXDocumentoPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_FXDP}${wsEndpoint}`;
    return this.http.delete<FinanciacionXDocumentoPago>(url, this.httpOptions).pipe(
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
