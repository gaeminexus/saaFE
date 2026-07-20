import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PathNotaCreditoCompra } from '../model/path-nota-credito-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class PathNotaCreditoCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<PathNotaCreditoCompra[] | null> {
    return this.http.get<PathNotaCreditoCompra[]>(`${ServiciosCxp.RS_PTCV}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<PathNotaCreditoCompra | null> {
    return this.http.get<PathNotaCreditoCompra>(`${ServiciosCxp.RS_PTCV}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<PathNotaCreditoCompra>): Observable<PathNotaCreditoCompra | null> {
    return this.http.post<PathNotaCreditoCompra>(ServiciosCxp.RS_PTCV, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<PathNotaCreditoCompra[] | null> {
    return this.http.post<PathNotaCreditoCompra[]>(`${ServiciosCxp.RS_PTCV}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<PathNotaCreditoCompra | null> {
    return this.http.delete<PathNotaCreditoCompra>(`${ServiciosCxp.RS_PTCV}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
