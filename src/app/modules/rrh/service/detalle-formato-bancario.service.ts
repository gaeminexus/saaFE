import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleFormatoBancario } from '../model/formato-archivo-bancario';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.DFMB, los campos de un formato bancario. */
@Injectable({
  providedIn: 'root',
})
export class DetalleFormatoBancarioService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleFormatoBancario[] | null> {
    const url = `${ServiciosRhh.RS_DFMB}/getAll`;
    return this.http.get<DetalleFormatoBancario[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<DetalleFormatoBancario | null> {
    const url = `${ServiciosRhh.RS_DFMB}/getId/${id}`;
    return this.http.get<DetalleFormatoBancario>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<DetalleFormatoBancario | null> {
    return this.http
      .post<DetalleFormatoBancario>(ServiciosRhh.RS_DFMB, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<DetalleFormatoBancario | null> {
    return this.http
      .put<DetalleFormatoBancario>(ServiciosRhh.RS_DFMB, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<DetalleFormatoBancario[] | null> {
    const url = `${ServiciosRhh.RS_DFMB}/selectByCriteria/`;
    return this.http.post<DetalleFormatoBancario[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<DetalleFormatoBancario | null> {
    const url = `${ServiciosRhh.RS_DFMB}/${id}`;
    return this.http.delete<DetalleFormatoBancario>(url, this.httpOptions).pipe(catchError(this.handleError));
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
