import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PersonaCuentaContable } from '../model/persona-cuenta-contable';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class PersonaCuentaContableService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de PersonaCuentaContable.
   */
  getAll(): Observable<PersonaCuentaContable[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_PRCC}${wsGetAll}`;
    return this.http.get<PersonaCuentaContable[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un registro de PersonaCuentaContable por su ID.
   */
  getById(id: string): Observable<PersonaCuentaContable | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_PRCC}${wsGetById}${id}`;
    return this.http.get<PersonaCuentaContable>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea un nuevo registro de PersonaCuentaContable.
   */
  add(datos: any): Observable<PersonaCuentaContable | null> {
    return this.http
      .post<PersonaCuentaContable>(ServiciosTsr.RS_PRCC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza un registro existente de PersonaCuentaContable.
   */
  update(datos: any): Observable<PersonaCuentaContable | null> {
    return this.http
      .put<PersonaCuentaContable>(ServiciosTsr.RS_PRCC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros de PersonaCuentaContable según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<PersonaCuentaContable[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_PRCC}${wsCriteria}`;
    return this.http
      .post<PersonaCuentaContable[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina un registro de PersonaCuentaContable por su ID.
   */
  delete(id: any): Observable<PersonaCuentaContable | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_PRCC}${wsDelete}`;
    return this.http
      .delete<PersonaCuentaContable>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
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
