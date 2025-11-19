import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MetodoPago } from '../model/metodo-pago';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class MetodoPagoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<MetodoPago[] | null> {
    const url = `${ServiciosCrd.RS_MTDP}/getAll`;
    return this.http.get<MetodoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<MetodoPago | null> {
    const url = `${ServiciosCrd.RS_MTDP}/getId/${id}`;
    return this.http.get<MetodoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<MetodoPago | null> {
    return this.http.post<MetodoPago>(ServiciosCrd.RS_MTDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<MetodoPago | null> {
    return this.http.put<MetodoPago>(ServiciosCrd.RS_MTDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<MetodoPago[] | null> {
    const url = `${ServiciosCrd.RS_MTDP}/selectByCriteria/`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<MetodoPago | null> {
    const url = `${ServiciosCrd.RS_MTDP}/${datos}`;
    return this.http.delete<MetodoPago>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error);
  }
}
