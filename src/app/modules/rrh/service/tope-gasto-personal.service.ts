import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { TopeGastoPersonal } from '../model/tope-gasto-personal';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.TPGP. */
@Injectable({
  providedIn: 'root',
})
export class TopeGastoPersonalService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<TopeGastoPersonal[] | null> {
    const url = `${ServiciosRhh.RS_TPGP}/getAll`;
    return this.http.get<TopeGastoPersonal[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<TopeGastoPersonal | null> {
    const url = `${ServiciosRhh.RS_TPGP}/getId/${id}`;
    return this.http.get<TopeGastoPersonal>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<TopeGastoPersonal | null> {
    return this.http
      .post<TopeGastoPersonal>(ServiciosRhh.RS_TPGP, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<TopeGastoPersonal | null> {
    return this.http
      .put<TopeGastoPersonal>(ServiciosRhh.RS_TPGP, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<TopeGastoPersonal[] | null> {
    const url = `${ServiciosRhh.RS_TPGP}/selectByCriteria/`;
    return this.http.post<TopeGastoPersonal[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<TopeGastoPersonal | null> {
    const url = `${ServiciosRhh.RS_TPGP}/${id}`;
    return this.http.delete<TopeGastoPersonal>(url, this.httpOptions).pipe(catchError(this.handleError));
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
