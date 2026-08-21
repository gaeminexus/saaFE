import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { HoraExtra } from '../model/hora-extra';
import { ServiciosRhh } from './ws-rrh';

/** Horas extra (RHH.HREX), con la aprobación en lote del contrato. */
@Injectable({
  providedIn: 'root',
})
export class HoraExtraService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  add(datos: any): Observable<HoraExtra | null> {
    return this.http
      .post<HoraExtra>(ServiciosRhh.RS_HREX, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<HoraExtra | null> {
    return this.http
      .put<HoraExtra>(ServiciosRhh.RS_HREX, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<HoraExtra[] | null> {
    const url = `${ServiciosRhh.RS_HREX}/selectByCriteria/`;
    return this.http.post<HoraExtra[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<HoraExtra | null> {
    const url = `${ServiciosRhh.RS_HREX}/${id}`;
    return this.http.delete<HoraExtra>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * POST /rest/hrex/aprobar?usuarioRegistro= — aprueba en lote; el cuerpo es la lista de ids,
   * así que el usuario va por query. Devuelve el número de horas aprobadas.
   */
  aprobar(ids: number[]): Observable<number> {
    const url = `${ServiciosRhh.RS_HREX}/aprobar`;
    const opciones = {
      ...this.httpOptions,
      params: new HttpParams().set('usuarioRegistro', usuarioSesion()),
    };
    return this.http
      .post<number>(url, ids, opciones)
      .pipe(catchError((error) => throwError(() => error.error || error)));
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
