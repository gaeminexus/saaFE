import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ReembolsoFacturaCompra } from '../model/reembolso-factura-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class ReembolsoFacturaCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ReembolsoFacturaCompra[] | null> {
    return this.http.get<ReembolsoFacturaCompra[]>(`${ServiciosCxp.RS_RMBF}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<ReembolsoFacturaCompra | null> {
    return this.http.get<ReembolsoFacturaCompra>(`${ServiciosCxp.RS_RMBF}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<ReembolsoFacturaCompra>): Observable<ReembolsoFacturaCompra | null> {
    return this.http.post<ReembolsoFacturaCompra>(ServiciosCxp.RS_RMBF, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<ReembolsoFacturaCompra>): Observable<ReembolsoFacturaCompra | null> {
    return this.http.put<ReembolsoFacturaCompra>(ServiciosCxp.RS_RMBF, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<ReembolsoFacturaCompra[] | null> {
    return this.http.post<ReembolsoFacturaCompra[]>(`${ServiciosCxp.RS_RMBF}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<ReembolsoFacturaCompra | null> {
    return this.http.delete<ReembolsoFacturaCompra>(`${ServiciosCxp.RS_RMBF}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** Reembolsos ACTIVOS de una factura, ordenados por id (endpoint dedicado del backend). */
  getByFactura(idFactura: number): Observable<ReembolsoFacturaCompra[] | null> {
    return this.http
      .get<ReembolsoFacturaCompra[]>(`${ServiciosCxp.RS_RMBF}/getByFactura/${idFactura}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
