import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { CausalTerminacion } from '../model/causal-terminacion';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.CSTR. */
@Injectable({
  providedIn: 'root',
})
export class CausalTerminacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CausalTerminacion[] | null> {
    const url = `${ServiciosRhh.RS_CSTR}/getAll`;
    return this.http.get<CausalTerminacion[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<CausalTerminacion | null> {
    const url = `${ServiciosRhh.RS_CSTR}/getId/${id}`;
    return this.http.get<CausalTerminacion>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<CausalTerminacion | null> {
    return this.http
      .post<CausalTerminacion>(ServiciosRhh.RS_CSTR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<CausalTerminacion | null> {
    return this.http
      .put<CausalTerminacion>(ServiciosRhh.RS_CSTR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<CausalTerminacion[] | null> {
    const url = `${ServiciosRhh.RS_CSTR}/selectByCriteria/`;
    return this.http.post<CausalTerminacion[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<CausalTerminacion | null> {
    const url = `${ServiciosRhh.RS_CSTR}/${id}`;
    return this.http.delete<CausalTerminacion>(url, this.httpOptions).pipe(catchError(this.handleError));
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
