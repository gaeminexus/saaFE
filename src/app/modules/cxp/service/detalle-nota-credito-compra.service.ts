import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleNotaCreditoCompra } from '../model/detalle-nota-credito-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class DetalleNotaCreditoCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleNotaCreditoCompra[] | null> {
    return this.http.get<DetalleNotaCreditoCompra[]>(`${ServiciosCxp.RS_DTCC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<DetalleNotaCreditoCompra | null> {
    return this.http.get<DetalleNotaCreditoCompra>(`${ServiciosCxp.RS_DTCC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleNotaCreditoCompra>): Observable<DetalleNotaCreditoCompra | null> {
    return this.http.post<DetalleNotaCreditoCompra>(ServiciosCxp.RS_DTCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleNotaCreditoCompra>): Observable<DetalleNotaCreditoCompra | null> {
    return this.http.put<DetalleNotaCreditoCompra>(ServiciosCxp.RS_DTCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<DetalleNotaCreditoCompra[] | null> {
    return this.http.post<DetalleNotaCreditoCompra[]>(`${ServiciosCxp.RS_DTCC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleNotaCreditoCompra | null> {
    return this.http.delete<DetalleNotaCreditoCompra>(`${ServiciosCxp.RS_DTCC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
