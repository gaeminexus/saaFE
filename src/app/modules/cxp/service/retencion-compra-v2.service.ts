import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { RetencionCompraV2 } from '../model/retencion-compra-v2';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class RetencionCompraV2Service {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<RetencionCompraV2[] | null> {
    return this.http.get<RetencionCompraV2[]>(`${ServiciosCxp.RS_RCV2}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<RetencionCompraV2 | null> {
    return this.http.get<RetencionCompraV2>(`${ServiciosCxp.RS_RCV2}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<RetencionCompraV2>): Observable<RetencionCompraV2 | null> {
    return this.http.post<RetencionCompraV2>(ServiciosCxp.RS_RCV2, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<RetencionCompraV2>): Observable<RetencionCompraV2 | null> {
    return this.http.put<RetencionCompraV2>(ServiciosCxp.RS_RCV2, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<RetencionCompraV2[] | null> {
    return this.http.post<RetencionCompraV2[]>(`${ServiciosCxp.RS_RCV2}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<RetencionCompraV2 | null> {
    return this.http.delete<RetencionCompraV2>(`${ServiciosCxp.RS_RCV2}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
