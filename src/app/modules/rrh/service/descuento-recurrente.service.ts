import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { DescuentoRecurrente } from '../model/descuento-recurrente';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.DSRC. */
@Injectable({
  providedIn: 'root',
})
export class DescuentoRecurrenteService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DescuentoRecurrente[] | null> {
    const url = `${ServiciosRhh.RS_DSRC}/getAll`;
    return this.http.get<DescuentoRecurrente[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<DescuentoRecurrente | null> {
    const url = `${ServiciosRhh.RS_DSRC}/getId/${id}`;
    return this.http.get<DescuentoRecurrente>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<DescuentoRecurrente | null> {
    return this.http
      .post<DescuentoRecurrente>(ServiciosRhh.RS_DSRC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<DescuentoRecurrente | null> {
    return this.http
      .put<DescuentoRecurrente>(ServiciosRhh.RS_DSRC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<DescuentoRecurrente[] | null> {
    const url = `${ServiciosRhh.RS_DSRC}/selectByCriteria/`;
    return this.http.post<DescuentoRecurrente[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<DescuentoRecurrente | null> {
    const url = `${ServiciosRhh.RS_DSRC}/${id}`;
    return this.http.delete<DescuentoRecurrente>(url, this.httpOptions).pipe(catchError(this.handleError));
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
