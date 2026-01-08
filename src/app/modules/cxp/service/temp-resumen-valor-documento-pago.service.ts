import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempResumenValorDocumentoPago } from '../model/temp_resumen_valor_documento_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class TempResumenValorDocumentoPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempResumenValorDocumentoPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_TRDP}${wsGetById}`;
    return this.http.get<TempResumenValorDocumentoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempResumenValorDocumentoPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_TRDP}${wsGetById}${id}`;
    return this.http.get<TempResumenValorDocumentoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempResumenValorDocumentoPago | null> {
    return this.http.post<TempResumenValorDocumentoPago>(ServiciosCxp.RS_TRDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempResumenValorDocumentoPago | null> {
    return this.http.put<TempResumenValorDocumentoPago>(ServiciosCxp.RS_TRDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempResumenValorDocumentoPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_TRDP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempResumenValorDocumentoPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_TRDP}${wsEndpoint}`;
    return this.http.delete<TempResumenValorDocumentoPago>(url, this.httpOptions).pipe(
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
