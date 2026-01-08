import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempValorImpuestoDocumentoPago } from '../model/temp_valor_impuesto_documento_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class TempValorImpuestoDocumentoPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempValorImpuestoDocumentoPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_TIDP}${wsGetById}`;
    return this.http.get<TempValorImpuestoDocumentoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempValorImpuestoDocumentoPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_TIDP}${wsGetById}${id}`;
    return this.http.get<TempValorImpuestoDocumentoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempValorImpuestoDocumentoPago | null> {
    return this.http.post<TempValorImpuestoDocumentoPago>(ServiciosCxp.RS_TIDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempValorImpuestoDocumentoPago | null> {
    return this.http.put<TempValorImpuestoDocumentoPago>(ServiciosCxp.RS_TIDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempValorImpuestoDocumentoPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_TIDP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempValorImpuestoDocumentoPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_TIDP}${wsEndpoint}`;
    return this.http.delete<TempValorImpuestoDocumentoPago>(url, this.httpOptions).pipe(
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
