import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { RetencionCompra } from '../model/retencion-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class RetencionCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<RetencionCompra[] | null> {
    return this.http.get<RetencionCompra[]>(`${ServiciosCxp.RS_RTCM}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<RetencionCompra | null> {
    return this.http.get<RetencionCompra>(`${ServiciosCxp.RS_RTCM}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<RetencionCompra>): Observable<RetencionCompra | null> {
    return this.http.post<RetencionCompra>(ServiciosCxp.RS_RTCM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<RetencionCompra>): Observable<RetencionCompra | null> {
    return this.http.put<RetencionCompra>(ServiciosCxp.RS_RTCM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<RetencionCompra[] | null> {
    return this.http.post<RetencionCompra[]>(`${ServiciosCxp.RS_RTCM}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<RetencionCompra | null> {
    return this.http.delete<RetencionCompra>(`${ServiciosCxp.RS_RTCM}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
