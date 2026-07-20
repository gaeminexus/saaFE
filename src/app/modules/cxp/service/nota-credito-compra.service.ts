import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { NotaCreditoCompra } from '../model/nota-credito-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class NotaCreditoCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NotaCreditoCompra[] | null> {
    return this.http.get<NotaCreditoCompra[]>(`${ServiciosCxp.RS_NTCC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<NotaCreditoCompra | null> {
    return this.http.get<NotaCreditoCompra>(`${ServiciosCxp.RS_NTCC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<NotaCreditoCompra>): Observable<NotaCreditoCompra | null> {
    return this.http.post<NotaCreditoCompra>(ServiciosCxp.RS_NTCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<NotaCreditoCompra>): Observable<NotaCreditoCompra | null> {
    return this.http.put<NotaCreditoCompra>(ServiciosCxp.RS_NTCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<NotaCreditoCompra[] | null> {
    return this.http.post<NotaCreditoCompra[]>(`${ServiciosCxp.RS_NTCC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<NotaCreditoCompra | null> {
    return this.http.delete<NotaCreditoCompra>(`${ServiciosCxp.RS_NTCC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
