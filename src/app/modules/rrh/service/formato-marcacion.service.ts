import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { FormatoMarcacion } from '../model/formato-marcacion';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.FMRC. */
@Injectable({
  providedIn: 'root',
})
export class FormatoMarcacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<FormatoMarcacion[] | null> {
    const url = `${ServiciosRhh.RS_FMRC}/getAll`;
    return this.http.get<FormatoMarcacion[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<FormatoMarcacion | null> {
    const url = `${ServiciosRhh.RS_FMRC}/getId/${id}`;
    return this.http.get<FormatoMarcacion>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<FormatoMarcacion | null> {
    return this.http
      .post<FormatoMarcacion>(ServiciosRhh.RS_FMRC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<FormatoMarcacion | null> {
    return this.http
      .put<FormatoMarcacion>(ServiciosRhh.RS_FMRC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<FormatoMarcacion[] | null> {
    const url = `${ServiciosRhh.RS_FMRC}/selectByCriteria/`;
    return this.http.post<FormatoMarcacion[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<FormatoMarcacion | null> {
    const url = `${ServiciosRhh.RS_FMRC}/${id}`;
    return this.http.delete<FormatoMarcacion>(url, this.httpOptions).pipe(catchError(this.handleError));
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
