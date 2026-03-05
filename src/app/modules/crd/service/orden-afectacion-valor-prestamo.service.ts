import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { OrdenAfectacionValorPrestamo } from '../model/orden-afectacion-valor-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class OrdenAfectacionValorPrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<OrdenAfectacionValorPrestamo[] | null> {
    const url = `${ServiciosCrd.RS_OAVP}/getAll`;
    return this.http.get<OrdenAfectacionValorPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<OrdenAfectacionValorPrestamo | null> {
    const url = `${ServiciosCrd.RS_OAVP}/getId/${id}`;
    return this.http.get<OrdenAfectacionValorPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<OrdenAfectacionValorPrestamo | null> {
    return this.http.post<OrdenAfectacionValorPrestamo>(ServiciosCrd.RS_OAVP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<OrdenAfectacionValorPrestamo | null> {
    return this.http.put<OrdenAfectacionValorPrestamo>(ServiciosCrd.RS_OAVP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<OrdenAfectacionValorPrestamo[] | null> {
    const url = `${ServiciosCrd.RS_OAVP}/selectByCriteria/`;
    return this.http.post<OrdenAfectacionValorPrestamo[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<OrdenAfectacionValorPrestamo | null> {
    const url = `${ServiciosCrd.RS_OAVP}/${id}`;
    return this.http.delete<OrdenAfectacionValorPrestamo>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
