import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { LiquidacionCompraCompra } from '../model/liquidacion-compra-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class LiquidacionCompraCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<LiquidacionCompraCompra[] | null> {
    return this.http.get<LiquidacionCompraCompra[]>(`${ServiciosCxp.RS_LQCC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<LiquidacionCompraCompra | null> {
    return this.http.get<LiquidacionCompraCompra>(`${ServiciosCxp.RS_LQCC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<LiquidacionCompraCompra>): Observable<LiquidacionCompraCompra | null> {
    return this.http.post<LiquidacionCompraCompra>(ServiciosCxp.RS_LQCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<LiquidacionCompraCompra>): Observable<LiquidacionCompraCompra | null> {
    return this.http.put<LiquidacionCompraCompra>(ServiciosCxp.RS_LQCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<LiquidacionCompraCompra[] | null> {
    return this.http.post<LiquidacionCompraCompra[]>(`${ServiciosCxp.RS_LQCC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<LiquidacionCompraCompra | null> {
    return this.http.delete<LiquidacionCompraCompra>(`${ServiciosCxp.RS_LQCC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
