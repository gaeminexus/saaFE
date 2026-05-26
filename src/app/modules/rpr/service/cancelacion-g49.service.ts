import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { CancelacionG49 } from '../model/cancelacion-g49';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class CancelacionG49Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CancelacionG49[] | null> {
    const url = `${ServiciosRpr.RS_CG49}/getAll`;
    return this.http.get<CancelacionG49[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<CancelacionG49 | null> {
    const url = `${ServiciosRpr.RS_CG49}/getId/${id}`;
    return this.http.get<CancelacionG49>(url).pipe(catchError(this.handleError));
  }

  add(datos: CancelacionG49): Observable<CancelacionG49 | null> {
    return this.http
      .post<CancelacionG49>(ServiciosRpr.RS_CG49, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: CancelacionG49): Observable<CancelacionG49 | null> {
    return this.http
      .put<CancelacionG49>(ServiciosRpr.RS_CG49, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<CancelacionG49 | null> {
    const url = `${ServiciosRpr.RS_CG49}/${id}`;
    return this.http.delete<CancelacionG49>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<CancelacionG49[] | null> {
    const url = `${ServiciosRpr.RS_CG49}/selectByCriteria`;
    return this.http
      .post<CancelacionG49[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
