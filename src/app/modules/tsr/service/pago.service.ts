import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Pago } from '../model/pago';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Pago.
   */
  getAll(): Observable<Pago[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_PGSS}${wsGetAll}`;
    return this.http.get<Pago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de Pago por su ID.
   */
  getById(id: string): Observable<Pago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_PGSS}${wsGetById}${id}`;
    return this.http.get<Pago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de Pago.
   */
  add(datos: any): Observable<Pago | null> {
    return this.http.post<Pago>(ServiciosTsr.RS_PGSS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de Pago.
   */
  update(datos: any): Observable<Pago | null> {
    return this.http.put<Pago>(ServiciosTsr.RS_PGSS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de Pago según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Pago[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_PGSS}${wsCriteria}`;
    return this.http.post<Pago[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de Pago por su ID.
   */
  delete(id: any): Observable<Pago | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_PGSS}${wsDelete}`;
    return this.http.delete<Pago>(url, this.httpOptions).pipe(
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
