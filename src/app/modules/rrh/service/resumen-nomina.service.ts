import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { ResumenNomina } from '../model/resumen-nomina';

@Injectable({
  providedIn: 'root',
})
export class ResumenNominaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ResumenNomina[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_RSMN}${wsGetById}`;
    return this.http.get<ResumenNomina[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ResumenNomina | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_RSMN}${wsGetById}${id}`;
    return this.http.get<ResumenNomina>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ResumenNomina | null> {
    return this.http.post<ResumenNomina>(ServiciosRhh.RS_RSMN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ResumenNomina | null> {
    return this.http.put<ResumenNomina>(ServiciosRhh.RS_RSMN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ResumenNomina[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_RSMN}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ResumenNomina | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_RSMN}${wsEndpoint}`;
    return this.http.delete<ResumenNomina>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * POST /rest/rsmn/consolidar — arma el resumen diario a partir de las marcaciones del rango.
   * Devuelve el número de resúmenes generados.
   *
   * Un día con un número impar de marcaciones **no se adivina**: sale con `inconsistente = 'S'`
   * para que alguien lo revise. Un colaborador sin turno tampoco inventa horario: sale con sus
   * horas trabajadas y sin atraso.
   */
  consolidar(desde: string, hasta: string): Observable<number> {
    const url = `${ServiciosRhh.RS_RSMN}/consolidar`;
    const cuerpo = { desde, hasta, usuarioRegistro: usuarioSesion() };
    return this.http
      .post<number>(url, cuerpo, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}

