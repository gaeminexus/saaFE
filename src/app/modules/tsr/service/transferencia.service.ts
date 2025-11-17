import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Transferencia } from '../model/transferencia';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TransferenciaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Transferencia.
   */
  getAll(): Observable<Transferencia[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TRNS}${wsGetAll}`;
    return this.http.get<Transferencia[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de Transferencia por su ID.
   */
  getById(id: string): Observable<Transferencia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TRNS}${wsGetById}${id}`;
    return this.http.get<Transferencia>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de Transferencia.
   */
  add(datos: any): Observable<Transferencia | null> {
    return this.http.post<Transferencia>(ServiciosTsr.RS_TRNS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de Transferencia.
   */
  update(datos: any): Observable<Transferencia | null> {
    return this.http.put<Transferencia>(ServiciosTsr.RS_TRNS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de Transferencia según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Transferencia[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TRNS}${wsCriteria}`;
    return this.http.post<Transferencia[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de Transferencia por su ID.
   */
  delete(id: any): Observable<Transferencia | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TRNS}${wsDelete}`;
    return this.http.delete<Transferencia>(url, this.httpOptions).pipe(
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
