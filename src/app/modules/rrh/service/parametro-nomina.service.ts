import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { ParametroNomina } from '../model/parametro-nomina';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.PRNM. */
@Injectable({
  providedIn: 'root',
})
export class ParametroNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParametroNomina[] | null> {
    const url = `${ServiciosRhh.RS_PRNM}/getAll`;
    return this.http.get<ParametroNomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<ParametroNomina | null> {
    const url = `${ServiciosRhh.RS_PRNM}/getId/${id}`;
    return this.http.get<ParametroNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<ParametroNomina | null> {
    return this.http
      .post<ParametroNomina>(ServiciosRhh.RS_PRNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<ParametroNomina | null> {
    return this.http
      .put<ParametroNomina>(ServiciosRhh.RS_PRNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<ParametroNomina[] | null> {
    const url = `${ServiciosRhh.RS_PRNM}/selectByCriteria/`;
    return this.http.post<ParametroNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<ParametroNomina | null> {
    const url = `${ServiciosRhh.RS_PRNM}/${id}`;
    return this.http.delete<ParametroNomina>(url, this.httpOptions).pipe(catchError(this.handleError));
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
