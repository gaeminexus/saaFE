import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { FormaPagoFacturaCompra } from '../model/forma-pago-factura-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class FormaPagoFacturaCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<FormaPagoFacturaCompra[] | null> {
    return this.http.get<FormaPagoFacturaCompra[]>(`${ServiciosCxp.RS_FPFM}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<FormaPagoFacturaCompra | null> {
    return this.http.get<FormaPagoFacturaCompra>(`${ServiciosCxp.RS_FPFM}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<FormaPagoFacturaCompra>): Observable<FormaPagoFacturaCompra | null> {
    return this.http.post<FormaPagoFacturaCompra>(ServiciosCxp.RS_FPFM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<FormaPagoFacturaCompra>): Observable<FormaPagoFacturaCompra | null> {
    return this.http.put<FormaPagoFacturaCompra>(ServiciosCxp.RS_FPFM, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<FormaPagoFacturaCompra[] | null> {
    return this.http.post<FormaPagoFacturaCompra[]>(`${ServiciosCxp.RS_FPFM}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<FormaPagoFacturaCompra | null> {
    return this.http.delete<FormaPagoFacturaCompra>(`${ServiciosCxp.RS_FPFM}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
