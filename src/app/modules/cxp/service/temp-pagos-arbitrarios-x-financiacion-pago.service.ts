import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempPagosArbitrariosXFinanciacionPago } from '../model/temp_pagos_arbitrarios_x_financiacion_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class TempPagosArbitrariosXFinanciacionPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempPagosArbitrariosXFinanciacionPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_TPFP}${wsGetById}`;
    return this.http.get<TempPagosArbitrariosXFinanciacionPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempPagosArbitrariosXFinanciacionPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_TPFP}${wsGetById}${id}`;
    return this.http.get<TempPagosArbitrariosXFinanciacionPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempPagosArbitrariosXFinanciacionPago | null> {
    return this.http.post<TempPagosArbitrariosXFinanciacionPago>(ServiciosCxp.RS_TPFP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempPagosArbitrariosXFinanciacionPago | null> {
    return this.http.put<TempPagosArbitrariosXFinanciacionPago>(ServiciosCxp.RS_TPFP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempPagosArbitrariosXFinanciacionPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_TPFP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempPagosArbitrariosXFinanciacionPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_TPFP}${wsEndpoint}`;
    return this.http.delete<TempPagosArbitrariosXFinanciacionPago>(url, this.httpOptions).pipe(
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
