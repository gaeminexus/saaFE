import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Conciliacion } from '../model/conciliacion';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class ConciliacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Conciliacion.
   */
  getAll(): Observable<Conciliacion[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CNCL}${wsGetAll}`;
    return this.http.get<Conciliacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de Conciliacion por su ID.
   */
  getById(id: string): Observable<Conciliacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CNCL}${wsGetById}${id}`;
    return this.http.get<Conciliacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de Conciliacion.
   */
  add(datos: any): Observable<Conciliacion | null> {
    return this.http.post<Conciliacion>(ServiciosTsr.RS_CNCL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de Conciliacion.
   */
  update(datos: any): Observable<Conciliacion | null> {
    return this.http.put<Conciliacion>(ServiciosTsr.RS_CNCL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de Conciliacion según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Conciliacion[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CNCL}${wsCriteria}`;
    return this.http.post<Conciliacion[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de Conciliacion por su ID.
   */
  delete(id: any): Observable<Conciliacion | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CNCL}${wsDelete}`;
    return this.http.delete<Conciliacion>(url, this.httpOptions).pipe(
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
