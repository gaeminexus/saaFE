import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ResumenValorDocumentoPago } from '../model/resumen_valor_documento_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class ResumenValorDocumentoPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ResumenValorDocumentoPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_RVDP}${wsGetById}`;
    return this.http.get<ResumenValorDocumentoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ResumenValorDocumentoPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_RVDP}${wsGetById}${id}`;
    return this.http.get<ResumenValorDocumentoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ResumenValorDocumentoPago | null> {
    return this.http.post<ResumenValorDocumentoPago>(ServiciosCxp.RS_RVDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ResumenValorDocumentoPago | null> {
    return this.http.put<ResumenValorDocumentoPago>(ServiciosCxp.RS_RVDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ResumenValorDocumentoPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_RVDP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ResumenValorDocumentoPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_RVDP}${wsEndpoint}`;
    return this.http.delete<ResumenValorDocumentoPago>(url, this.httpOptions).pipe(
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
