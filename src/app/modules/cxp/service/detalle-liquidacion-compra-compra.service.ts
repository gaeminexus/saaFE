import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleLiquidacionCompraCompra } from '../model/detalle-liquidacion-compra-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class DetalleLiquidacionCompraCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleLiquidacionCompraCompra[] | null> {
    return this.http.get<DetalleLiquidacionCompraCompra[]>(`${ServiciosCxp.RS_DLCM}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<DetalleLiquidacionCompraCompra | null> {
    return this.http.get<DetalleLiquidacionCompraCompra>(`${ServiciosCxp.RS_DLCM}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleLiquidacionCompraCompra>): Observable<DetalleLiquidacionCompraCompra | null> {
    return this.http.post<DetalleLiquidacionCompraCompra>(ServiciosCxp.RS_DLCM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleLiquidacionCompraCompra>): Observable<DetalleLiquidacionCompraCompra | null> {
    return this.http.put<DetalleLiquidacionCompraCompra>(ServiciosCxp.RS_DLCM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<DetalleLiquidacionCompraCompra[] | null> {
    return this.http.post<DetalleLiquidacionCompraCompra[]>(`${ServiciosCxp.RS_DLCM}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleLiquidacionCompraCompra | null> {
    return this.http.delete<DetalleLiquidacionCompraCompra>(`${ServiciosCxp.RS_DLCM}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
