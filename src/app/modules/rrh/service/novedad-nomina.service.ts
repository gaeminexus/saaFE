import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { NovedadNomina } from '../model/novedad-nomina';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.NVNM. */
@Injectable({
  providedIn: 'root',
})
export class NovedadNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NovedadNomina[] | null> {
    const url = `${ServiciosRhh.RS_NVNM}/getAll`;
    return this.http.get<NovedadNomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<NovedadNomina | null> {
    const url = `${ServiciosRhh.RS_NVNM}/getId/${id}`;
    return this.http.get<NovedadNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<NovedadNomina | null> {
    return this.http
      .post<NovedadNomina>(ServiciosRhh.RS_NVNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<NovedadNomina | null> {
    return this.http
      .put<NovedadNomina>(ServiciosRhh.RS_NVNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<NovedadNomina[] | null> {
    const url = `${ServiciosRhh.RS_NVNM}/selectByCriteria/`;
    return this.http.post<NovedadNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<NovedadNomina | null> {
    const url = `${ServiciosRhh.RS_NVNM}/${id}`;
    return this.http.delete<NovedadNomina>(url, this.httpOptions).pipe(catchError(this.handleError));
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
