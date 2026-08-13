import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleRetencionCompraV2 } from '../model/detalle-retencion-compra-v2';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class DetalleRetencionCompraV2Service {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleRetencionCompraV2[] | null> {
    return this.http.get<DetalleRetencionCompraV2[]>(`${ServiciosCxp.RS_DRC2}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<DetalleRetencionCompraV2 | null> {
    return this.http.get<DetalleRetencionCompraV2>(`${ServiciosCxp.RS_DRC2}/getId/${id}`).pipe(catchError(this.handleError));
  }

  /** Endpoint dedicado del backend: trae todas las líneas de una retención V2 por el id de la cabecera. */
  getByRetencionCompraV2(idRetencion: number): Observable<DetalleRetencionCompraV2[] | null> {
    return this.http.get<DetalleRetencionCompraV2[]>(`${ServiciosCxp.RS_DRC2}/getByRetencionCompraV2/${idRetencion}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleRetencionCompraV2>): Observable<DetalleRetencionCompraV2 | null> {
    return this.http.post<DetalleRetencionCompraV2>(ServiciosCxp.RS_DRC2, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleRetencionCompraV2>): Observable<DetalleRetencionCompraV2 | null> {
    return this.http.put<DetalleRetencionCompraV2>(ServiciosCxp.RS_DRC2, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<DetalleRetencionCompraV2[] | null> {
    return this.http.post<DetalleRetencionCompraV2[]>(`${ServiciosCxp.RS_DRC2}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleRetencionCompraV2 | null> {
    return this.http.delete<DetalleRetencionCompraV2>(`${ServiciosCxp.RS_DRC2}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
