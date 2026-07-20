import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { FacturaCompra } from '../model/factura-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class FacturaCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<FacturaCompra[] | null> {
    return this.http.get<FacturaCompra[]>(`${ServiciosCxp.RS_FCTC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<FacturaCompra | null> {
    return this.http.get<FacturaCompra>(`${ServiciosCxp.RS_FCTC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<FacturaCompra>): Observable<FacturaCompra | null> {
    return this.http.post<FacturaCompra>(ServiciosCxp.RS_FCTC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<FacturaCompra>): Observable<FacturaCompra | null> {
    return this.http.put<FacturaCompra>(ServiciosCxp.RS_FCTC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<FacturaCompra[] | null> {
    return this.http.post<FacturaCompra[]>(`${ServiciosCxp.RS_FCTC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<FacturaCompra | null> {
    return this.http.delete<FacturaCompra>(`${ServiciosCxp.RS_FCTC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
