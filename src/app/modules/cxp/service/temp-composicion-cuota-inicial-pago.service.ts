import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempComposicionCuotaInicialPago } from '../model/temp_composicion_cuota_inicial_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class TempComposicionCuotaInicialPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempComposicionCuotaInicialPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_TCIP}${wsGetById}`;
    return this.http.get<TempComposicionCuotaInicialPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempComposicionCuotaInicialPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_TCIP}${wsGetById}${id}`;
    return this.http.get<TempComposicionCuotaInicialPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempComposicionCuotaInicialPago | null> {
    return this.http.post<TempComposicionCuotaInicialPago>(ServiciosCxp.RS_TCIP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempComposicionCuotaInicialPago | null> {
    return this.http.put<TempComposicionCuotaInicialPago>(ServiciosCxp.RS_TCIP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempComposicionCuotaInicialPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_TCIP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempComposicionCuotaInicialPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_TCIP}${wsEndpoint}`;
    return this.http.delete<TempComposicionCuotaInicialPago>(url, this.httpOptions).pipe(
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
