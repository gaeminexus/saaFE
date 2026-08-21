import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { ConfiguracionNomina } from '../model/configuracion-nomina';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.CFNM. */
@Injectable({
  providedIn: 'root',
})
export class ConfiguracionNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ConfiguracionNomina[] | null> {
    const url = `${ServiciosRhh.RS_CFNM}/getAll`;
    return this.http.get<ConfiguracionNomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<ConfiguracionNomina | null> {
    const url = `${ServiciosRhh.RS_CFNM}/getId/${id}`;
    return this.http.get<ConfiguracionNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<ConfiguracionNomina | null> {
    return this.http
      .post<ConfiguracionNomina>(ServiciosRhh.RS_CFNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<ConfiguracionNomina | null> {
    return this.http
      .put<ConfiguracionNomina>(ServiciosRhh.RS_CFNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<ConfiguracionNomina[] | null> {
    const url = `${ServiciosRhh.RS_CFNM}/selectByCriteria/`;
    return this.http.post<ConfiguracionNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<ConfiguracionNomina | null> {
    const url = `${ServiciosRhh.RS_CFNM}/${id}`;
    return this.http.delete<ConfiguracionNomina>(url, this.httpOptions).pipe(catchError(this.handleError));
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
