import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Titular } from '../model/titular';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class TitularService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Titular.
   */
  getAll(): Observable<Titular[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TTLR}${wsGetAll}`;
    return this.http.get<Titular[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un registro de Titular por su ID.
   */
  getById(id: string): Observable<Titular | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TTLR}${wsGetById}${id}`;
    return this.http.get<Titular>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea un nuevo registro de Titular.
   */
  add(datos: any): Observable<Titular | null> {
    return this.http
      .post<Titular>(ServiciosTsr.RS_TTLR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza un registro existente de Titular.
   */
  update(datos: any): Observable<Titular | null> {
    return this.http
      .put<Titular>(ServiciosTsr.RS_TTLR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros de Titular según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Titular[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TTLR}${wsCriteria}`;
    return this.http
      .post<Titular[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina un registro de Titular por su ID.
   */
  delete(id: any): Observable<Titular | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TTLR}${wsDelete}`;
    return this.http.delete<Titular>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * Manejo centralizado de errores HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
