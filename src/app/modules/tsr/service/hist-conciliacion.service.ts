import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HistConciliacion } from '../model/hist-conciliacion';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class HistConciliacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de HistConciliacion.
   */
  getAll(): Observable<HistConciliacion[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CNCH}${wsGetAll}`;
    return this.http.get<HistConciliacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de HistConciliacion por su ID.
   */
  getById(id: string): Observable<HistConciliacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CNCH}${wsGetById}${id}`;
    return this.http.get<HistConciliacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de HistConciliacion.
   */
  add(datos: any): Observable<HistConciliacion | null> {
    return this.http.post<HistConciliacion>(ServiciosTsr.RS_CNCH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de HistConciliacion.
   */
  update(datos: any): Observable<HistConciliacion | null> {
    return this.http.put<HistConciliacion>(ServiciosTsr.RS_CNCH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de HistConciliacion según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<HistConciliacion[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CNCH}${wsCriteria}`;
    return this.http.post<HistConciliacion[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de HistConciliacion por su ID.
   */
  delete(id: any): Observable<HistConciliacion | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CNCH}${wsDelete}`;
    return this.http.delete<HistConciliacion>(url, this.httpOptions).pipe(
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

