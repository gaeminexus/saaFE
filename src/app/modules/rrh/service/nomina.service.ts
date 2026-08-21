import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { Nomina } from '../model/nomina';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.NMNA. */
@Injectable({
  providedIn: 'root',
})
export class NominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Nomina[] | null> {
    const url = `${ServiciosRhh.RS_NMNA}/getAll`;
    return this.http.get<Nomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<Nomina | null> {
    const url = `${ServiciosRhh.RS_NMNA}/getId/${id}`;
    return this.http.get<Nomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<Nomina | null> {
    return this.http
      .post<Nomina>(ServiciosRhh.RS_NMNA, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<Nomina | null> {
    return this.http
      .put<Nomina>(ServiciosRhh.RS_NMNA, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<Nomina[] | null> {
    const url = `${ServiciosRhh.RS_NMNA}/selectByCriteria/`;
    return this.http.post<Nomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<Nomina | null> {
    const url = `${ServiciosRhh.RS_NMNA}/${id}`;
    return this.http.delete<Nomina>(url, this.httpOptions).pipe(catchError(this.handleError));
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
