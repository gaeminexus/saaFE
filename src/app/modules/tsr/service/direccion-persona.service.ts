import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DireccionPersona } from '../model/direccion-persona';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class DireccionPersonaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de DireccionPersona.
   */
  getAll(): Observable<DireccionPersona[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_PDRC}${wsGetAll}`;
    return this.http.get<DireccionPersona[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de DireccionPersona por su ID.
   */
  getById(id: string): Observable<DireccionPersona | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_PDRC}${wsGetById}${id}`;
    return this.http.get<DireccionPersona>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de DireccionPersona.
   */
  add(datos: any): Observable<DireccionPersona | null> {
    return this.http.post<DireccionPersona>(ServiciosTsr.RS_PDRC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de DireccionPersona.
   */
  update(datos: any): Observable<DireccionPersona | null> {
    return this.http.put<DireccionPersona>(ServiciosTsr.RS_PDRC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de DireccionPersona según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<DireccionPersona[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_PDRC}${wsCriteria}`;
    return this.http.post<DireccionPersona[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de DireccionPersona por su ID.
   */
  delete(id: any): Observable<DireccionPersona | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_PDRC}${wsDelete}`;
    return this.http.delete<DireccionPersona>(url, this.httpOptions).pipe(
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

