import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempCuotaXFinanciacionPago } from '../model/temp_cuota_x_financiacion_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class TempCuotaXFinanciacionPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempCuotaXFinanciacionPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_TCDP}${wsGetById}`;
    return this.http.get<TempCuotaXFinanciacionPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempCuotaXFinanciacionPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_TCDP}${wsGetById}${id}`;
    return this.http.get<TempCuotaXFinanciacionPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempCuotaXFinanciacionPago | null> {
    return this.http.post<TempCuotaXFinanciacionPago>(ServiciosCxp.RS_TCDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempCuotaXFinanciacionPago | null> {
    return this.http.put<TempCuotaXFinanciacionPago>(ServiciosCxp.RS_TCDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempCuotaXFinanciacionPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_TCDP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempCuotaXFinanciacionPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_TCDP}${wsEndpoint}`;
    return this.http.delete<TempCuotaXFinanciacionPago>(url, this.httpOptions).pipe(
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
