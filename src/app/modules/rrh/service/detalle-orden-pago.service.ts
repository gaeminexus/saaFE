import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleOrdenPagoNomina } from '../model/orden-pago-nomina';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.DRPG, las líneas de una orden de pago. */
@Injectable({
  providedIn: 'root',
})
export class DetalleOrdenPagoNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleOrdenPagoNomina[] | null> {
    const url = `${ServiciosRhh.RS_DRPG}/getAll`;
    return this.http.get<DetalleOrdenPagoNomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<DetalleOrdenPagoNomina | null> {
    const url = `${ServiciosRhh.RS_DRPG}/getId/${id}`;
    return this.http.get<DetalleOrdenPagoNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<DetalleOrdenPagoNomina | null> {
    return this.http
      .post<DetalleOrdenPagoNomina>(ServiciosRhh.RS_DRPG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<DetalleOrdenPagoNomina | null> {
    return this.http
      .put<DetalleOrdenPagoNomina>(ServiciosRhh.RS_DRPG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<DetalleOrdenPagoNomina[] | null> {
    const url = `${ServiciosRhh.RS_DRPG}/selectByCriteria/`;
    return this.http.post<DetalleOrdenPagoNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<DetalleOrdenPagoNomina | null> {
    const url = `${ServiciosRhh.RS_DRPG}/${id}`;
    return this.http.delete<DetalleOrdenPagoNomina>(url, this.httpOptions).pipe(catchError(this.handleError));
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
