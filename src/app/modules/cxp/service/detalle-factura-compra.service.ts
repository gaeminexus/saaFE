import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleFacturaCompra } from '../model/detalle-factura-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class DetalleFacturaCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleFacturaCompra[] | null> {
    return this.http.get<DetalleFacturaCompra[]>(`${ServiciosCxp.RS_DFCC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<DetalleFacturaCompra | null> {
    return this.http.get<DetalleFacturaCompra>(`${ServiciosCxp.RS_DFCC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleFacturaCompra>): Observable<DetalleFacturaCompra | null> {
    return this.http.post<DetalleFacturaCompra>(ServiciosCxp.RS_DFCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleFacturaCompra>): Observable<DetalleFacturaCompra | null> {
    return this.http.put<DetalleFacturaCompra>(ServiciosCxp.RS_DFCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<DetalleFacturaCompra[] | null> {
    return this.http.post<DetalleFacturaCompra[]>(`${ServiciosCxp.RS_DFCC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleFacturaCompra | null> {
    return this.http.delete<DetalleFacturaCompra>(`${ServiciosCxp.RS_DFCC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
