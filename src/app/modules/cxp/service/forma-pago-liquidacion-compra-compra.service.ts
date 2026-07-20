import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { FormaPagoLiquidacionCompraCompra } from '../model/forma-pago-liquidacion-compra-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class FormaPagoLiquidacionCompraCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<FormaPagoLiquidacionCompraCompra[] | null> {
    return this.http.get<FormaPagoLiquidacionCompraCompra[]>(`${ServiciosCxp.RS_FPLM}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<FormaPagoLiquidacionCompraCompra | null> {
    return this.http.get<FormaPagoLiquidacionCompraCompra>(`${ServiciosCxp.RS_FPLM}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<FormaPagoLiquidacionCompraCompra>): Observable<FormaPagoLiquidacionCompraCompra | null> {
    return this.http.post<FormaPagoLiquidacionCompraCompra>(ServiciosCxp.RS_FPLM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<FormaPagoLiquidacionCompraCompra>): Observable<FormaPagoLiquidacionCompraCompra | null> {
    return this.http.put<FormaPagoLiquidacionCompraCompra>(ServiciosCxp.RS_FPLM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<FormaPagoLiquidacionCompraCompra[] | null> {
    return this.http.post<FormaPagoLiquidacionCompraCompra[]>(`${ServiciosCxp.RS_FPLM}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<FormaPagoLiquidacionCompraCompra | null> {
    return this.http.delete<FormaPagoLiquidacionCompraCompra>(`${ServiciosCxp.RS_FPLM}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
