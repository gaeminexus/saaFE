import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ProductoPago } from '../model/producto_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class ProductoPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ProductoPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_PRDP}${wsGetById}`;
    return this.http.get<ProductoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ProductoPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_PRDP}${wsGetById}${id}`;
    return this.http.get<ProductoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ProductoPago | null> {
    return this.http.post<ProductoPago>(ServiciosCxp.RS_PRDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ProductoPago | null> {
    return this.http.put<ProductoPago>(ServiciosCxp.RS_PRDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ProductoPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_PRDP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ProductoPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_PRDP}${wsEndpoint}`;
    return this.http.delete<ProductoPago>(url, this.httpOptions).pipe(
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
