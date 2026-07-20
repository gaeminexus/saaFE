import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleRetencionCompra } from '../model/detalle-retencion-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class DetalleRetencionCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleRetencionCompra[] | null> {
    return this.http.get<DetalleRetencionCompra[]>(`${ServiciosCxp.RS_DRCM}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<DetalleRetencionCompra | null> {
    return this.http.get<DetalleRetencionCompra>(`${ServiciosCxp.RS_DRCM}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleRetencionCompra>): Observable<DetalleRetencionCompra | null> {
    return this.http.post<DetalleRetencionCompra>(ServiciosCxp.RS_DRCM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleRetencionCompra>): Observable<DetalleRetencionCompra | null> {
    return this.http.put<DetalleRetencionCompra>(ServiciosCxp.RS_DRCM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<DetalleRetencionCompra[] | null> {
    return this.http.post<DetalleRetencionCompra[]>(`${ServiciosCxp.RS_DRCM}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleRetencionCompra | null> {
    return this.http.delete<DetalleRetencionCompra>(`${ServiciosCxp.RS_DRCM}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
