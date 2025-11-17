import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PersonaRol } from '../model/persona-rol';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class PersonaRolService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de PersonaRol.
   */
  getAll(): Observable<PersonaRol[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_PRRL}${wsGetAll}`;
    return this.http.get<PersonaRol[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de PersonaRol por su ID.
   */
  getById(id: string): Observable<PersonaRol | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_PRRL}${wsGetById}${id}`;
    return this.http.get<PersonaRol>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de PersonaRol.
   */
  add(datos: any): Observable<PersonaRol | null> {
    return this.http.post<PersonaRol>(ServiciosTsr.RS_PRRL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de PersonaRol.
   */
  update(datos: any): Observable<PersonaRol | null> {
    return this.http.put<PersonaRol>(ServiciosTsr.RS_PRRL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de PersonaRol según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<PersonaRol[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_PRRL}${wsCriteria}`;
    return this.http.post<PersonaRol[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de PersonaRol por su ID.
   */
  delete(id: any): Observable<PersonaRol | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_PRRL}${wsDelete}`;
    return this.http.delete<PersonaRol>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
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
