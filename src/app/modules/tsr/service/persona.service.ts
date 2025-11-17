import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Persona } from '../model/persona';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class PersonaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Persona.
   */
  getAll(): Observable<Persona[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_PRSN}${wsGetAll}`;
    return this.http.get<Persona[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de Persona por su ID.
   */
  getById(id: string): Observable<Persona | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_PRSN}${wsGetById}${id}`;
    return this.http.get<Persona>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de Persona.
   */
  add(datos: any): Observable<Persona | null> {
    return this.http.post<Persona>(ServiciosTsr.RS_PRSN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de Persona.
   */
  update(datos: any): Observable<Persona | null> {
    return this.http.put<Persona>(ServiciosTsr.RS_PRSN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de Persona según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Persona[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_PRSN}${wsCriteria}`;
    return this.http.post<Persona[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de Persona por su ID.
   */
  delete(id: any): Observable<Persona | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_PRSN}${wsDelete}`;
    return this.http.delete<Persona>(url, this.httpOptions).pipe(
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
