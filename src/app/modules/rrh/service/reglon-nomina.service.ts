import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { ReglonNomina } from '../model/reglon-nomina';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.RNGL. */
@Injectable({
  providedIn: 'root',
})
export class ReglonNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ReglonNomina[] | null> {
    const url = `${ServiciosRhh.RS_RNGL}/getAll`;
    return this.http.get<ReglonNomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<ReglonNomina | null> {
    const url = `${ServiciosRhh.RS_RNGL}/getId/${id}`;
    return this.http.get<ReglonNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<ReglonNomina | null> {
    return this.http
      .post<ReglonNomina>(ServiciosRhh.RS_RNGL, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<ReglonNomina | null> {
    return this.http
      .put<ReglonNomina>(ServiciosRhh.RS_RNGL, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<ReglonNomina[] | null> {
    const url = `${ServiciosRhh.RS_RNGL}/selectByCriteria/`;
    return this.http.post<ReglonNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<ReglonNomina | null> {
    const url = `${ServiciosRhh.RS_RNGL}/${id}`;
    return this.http.delete<ReglonNomina>(url, this.httpOptions).pipe(catchError(this.handleError));
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
