import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PathRetencionCompra } from '../model/path-retencion-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class PathRetencionCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<PathRetencionCompra[] | null> {
    return this.http.get<PathRetencionCompra[]>(`${ServiciosCxp.RS_PRCM}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<PathRetencionCompra | null> {
    return this.http.get<PathRetencionCompra>(`${ServiciosCxp.RS_PRCM}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<PathRetencionCompra>): Observable<PathRetencionCompra | null> {
    return this.http.post<PathRetencionCompra>(ServiciosCxp.RS_PRCM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<PathRetencionCompra[] | null> {
    return this.http.post<PathRetencionCompra[]>(`${ServiciosCxp.RS_PRCM}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<PathRetencionCompra | null> {
    return this.http.delete<PathRetencionCompra>(`${ServiciosCxp.RS_PRCM}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
