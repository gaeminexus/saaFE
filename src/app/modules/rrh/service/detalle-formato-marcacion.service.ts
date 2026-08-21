import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleFormatoMarcacion } from '../model/formato-marcacion';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.DFMR. */
@Injectable({
  providedIn: 'root',
})
export class DetalleFormatoMarcacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleFormatoMarcacion[] | null> {
    const url = `${ServiciosRhh.RS_DFMR}/getAll`;
    return this.http.get<DetalleFormatoMarcacion[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<DetalleFormatoMarcacion | null> {
    const url = `${ServiciosRhh.RS_DFMR}/getId/${id}`;
    return this.http.get<DetalleFormatoMarcacion>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<DetalleFormatoMarcacion | null> {
    return this.http
      .post<DetalleFormatoMarcacion>(ServiciosRhh.RS_DFMR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<DetalleFormatoMarcacion | null> {
    return this.http
      .put<DetalleFormatoMarcacion>(ServiciosRhh.RS_DFMR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<DetalleFormatoMarcacion[] | null> {
    const url = `${ServiciosRhh.RS_DFMR}/selectByCriteria/`;
    return this.http.post<DetalleFormatoMarcacion[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<DetalleFormatoMarcacion | null> {
    const url = `${ServiciosRhh.RS_DFMR}/${id}`;
    return this.http.delete<DetalleFormatoMarcacion>(url, this.httpOptions).pipe(catchError(this.handleError));
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
