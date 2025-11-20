import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';
import { TipoPago } from '../model/tipo-pago';

@Injectable({
  providedIn: 'root'
})
export class TipoPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<TipoPago[] | null> {
    const url = `${ServiciosCrd.RS_TPPG}/getAll`;
    return this.http.get<TipoPago[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<TipoPago | null> {
    const url = `${ServiciosCrd.RS_TPPG}/getId/${id}`;
    return this.http.get<TipoPago>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<TipoPago | null> {
    return this.http.post<TipoPago>(ServiciosCrd.RS_TPPG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<TipoPago | null> {
    return this.http.put<TipoPago>(ServiciosCrd.RS_TPPG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<TipoPago[] | null> {
    const url = `${ServiciosCrd.RS_TPPG}/selectByCriteria/`;
    return this.http.post<TipoPago[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: any): Observable<TipoPago | null> {
    const url = `${ServiciosCrd.RS_TPPG}/${id}`;
    return this.http.delete<TipoPago>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error);
  }
}
