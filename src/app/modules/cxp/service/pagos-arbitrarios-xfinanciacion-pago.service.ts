import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PagosArbitrariosXFinanciacionPago } from '../model/pagos_arbitrarios_x_financiacion_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class PagosArbitrariosXFinanciacionPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<PagosArbitrariosXFinanciacionPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_PAFP}${wsGetById}`;
    return this.http.get<PagosArbitrariosXFinanciacionPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<PagosArbitrariosXFinanciacionPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_PAFP}${wsGetById}${id}`;
    return this.http.get<PagosArbitrariosXFinanciacionPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<PagosArbitrariosXFinanciacionPago | null> {
    return this.http.post<PagosArbitrariosXFinanciacionPago>(ServiciosCxp.RS_PAFP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<PagosArbitrariosXFinanciacionPago | null> {
    return this.http.put<PagosArbitrariosXFinanciacionPago>(ServiciosCxp.RS_PAFP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<PagosArbitrariosXFinanciacionPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_PAFP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<PagosArbitrariosXFinanciacionPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_PAFP}${wsEndpoint}`;
    return this.http.delete<PagosArbitrariosXFinanciacionPago>(url, this.httpOptions).pipe(
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
