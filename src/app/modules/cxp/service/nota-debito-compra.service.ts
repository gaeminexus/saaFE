import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { NotaDebitoCompra } from '../model/nota-debito-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class NotaDebitoCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NotaDebitoCompra[] | null> {
    return this.http.get<NotaDebitoCompra[]>(`${ServiciosCxp.RS_NTDC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<NotaDebitoCompra | null> {
    return this.http.get<NotaDebitoCompra>(`${ServiciosCxp.RS_NTDC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<NotaDebitoCompra>): Observable<NotaDebitoCompra | null> {
    return this.http.post<NotaDebitoCompra>(ServiciosCxp.RS_NTDC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<NotaDebitoCompra>): Observable<NotaDebitoCompra | null> {
    return this.http.put<NotaDebitoCompra>(ServiciosCxp.RS_NTDC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<NotaDebitoCompra[] | null> {
    return this.http.post<NotaDebitoCompra[]>(`${ServiciosCxp.RS_NTDC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<NotaDebitoCompra | null> {
    return this.http.delete<NotaDebitoCompra>(`${ServiciosCxp.RS_NTDC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
