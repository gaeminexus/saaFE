import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { AcumuladoNomina } from '../model/acumulado-nomina';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.ACMN. */
@Injectable({
  providedIn: 'root',
})
export class AcumuladoNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<AcumuladoNomina[] | null> {
    const url = `${ServiciosRhh.RS_ACMN}/getAll`;
    return this.http.get<AcumuladoNomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<AcumuladoNomina | null> {
    const url = `${ServiciosRhh.RS_ACMN}/getId/${id}`;
    return this.http.get<AcumuladoNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<AcumuladoNomina | null> {
    return this.http
      .post<AcumuladoNomina>(ServiciosRhh.RS_ACMN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<AcumuladoNomina | null> {
    return this.http
      .put<AcumuladoNomina>(ServiciosRhh.RS_ACMN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<AcumuladoNomina[] | null> {
    const url = `${ServiciosRhh.RS_ACMN}/selectByCriteria/`;
    return this.http.post<AcumuladoNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<AcumuladoNomina | null> {
    const url = `${ServiciosRhh.RS_ACMN}/${id}`;
    return this.http.delete<AcumuladoNomina>(url, this.httpOptions).pipe(catchError(this.handleError));
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
