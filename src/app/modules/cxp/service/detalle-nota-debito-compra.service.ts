import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleNotaDebitoCompra } from '../model/detalle-nota-debito-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class DetalleNotaDebitoCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleNotaDebitoCompra[] | null> {
    return this.http.get<DetalleNotaDebitoCompra[]>(`${ServiciosCxp.RS_DTDC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<DetalleNotaDebitoCompra | null> {
    return this.http.get<DetalleNotaDebitoCompra>(`${ServiciosCxp.RS_DTDC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleNotaDebitoCompra>): Observable<DetalleNotaDebitoCompra | null> {
    return this.http.post<DetalleNotaDebitoCompra>(ServiciosCxp.RS_DTDC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleNotaDebitoCompra>): Observable<DetalleNotaDebitoCompra | null> {
    return this.http.put<DetalleNotaDebitoCompra>(ServiciosCxp.RS_DTDC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<DetalleNotaDebitoCompra[] | null> {
    return this.http.post<DetalleNotaDebitoCompra[]>(`${ServiciosCxp.RS_DTDC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleNotaDebitoCompra | null> {
    return this.http.delete<DetalleNotaDebitoCompra>(`${ServiciosCxp.RS_DTDC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
