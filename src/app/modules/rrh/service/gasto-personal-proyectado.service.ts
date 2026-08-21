import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { GastoPersonalProyectado } from '../model/gasto-personal-proyectado';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.GSPR. */
@Injectable({
  providedIn: 'root',
})
export class GastoPersonalProyectadoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<GastoPersonalProyectado[] | null> {
    const url = `${ServiciosRhh.RS_GSPR}/getAll`;
    return this.http.get<GastoPersonalProyectado[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<GastoPersonalProyectado | null> {
    const url = `${ServiciosRhh.RS_GSPR}/getId/${id}`;
    return this.http.get<GastoPersonalProyectado>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<GastoPersonalProyectado | null> {
    return this.http
      .post<GastoPersonalProyectado>(ServiciosRhh.RS_GSPR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<GastoPersonalProyectado | null> {
    return this.http
      .put<GastoPersonalProyectado>(ServiciosRhh.RS_GSPR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<GastoPersonalProyectado[] | null> {
    const url = `${ServiciosRhh.RS_GSPR}/selectByCriteria/`;
    return this.http.post<GastoPersonalProyectado[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<GastoPersonalProyectado | null> {
    const url = `${ServiciosRhh.RS_GSPR}/${id}`;
    return this.http.delete<GastoPersonalProyectado>(url, this.httpOptions).pipe(catchError(this.handleError));
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
