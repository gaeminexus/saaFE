import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { CuotaDescuento } from '../model/descuento-recurrente';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.CTDS. */
@Injectable({
  providedIn: 'root',
})
export class CuotaDescuentoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CuotaDescuento[] | null> {
    const url = `${ServiciosRhh.RS_CTDS}/getAll`;
    return this.http.get<CuotaDescuento[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<CuotaDescuento | null> {
    const url = `${ServiciosRhh.RS_CTDS}/getId/${id}`;
    return this.http.get<CuotaDescuento>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<CuotaDescuento | null> {
    return this.http
      .post<CuotaDescuento>(ServiciosRhh.RS_CTDS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<CuotaDescuento | null> {
    return this.http
      .put<CuotaDescuento>(ServiciosRhh.RS_CTDS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<CuotaDescuento[] | null> {
    const url = `${ServiciosRhh.RS_CTDS}/selectByCriteria/`;
    return this.http.post<CuotaDescuento[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<CuotaDescuento | null> {
    const url = `${ServiciosRhh.RS_CTDS}/${id}`;
    return this.http.delete<CuotaDescuento>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  // Manejo de errores HTTP (respetando patrón de of(null) con status 200)
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
