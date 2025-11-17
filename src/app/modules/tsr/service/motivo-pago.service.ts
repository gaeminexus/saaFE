import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MotivoPago } from '../model/motivo-pago';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class MotivoPagoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de MotivoPago.
   */
  getAll(): Observable<MotivoPago[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_PMTV}${wsGetAll}`;
    return this.http.get<MotivoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de MotivoPago por su ID.
   */
  getById(id: string): Observable<MotivoPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_PMTV}${wsGetById}${id}`;
    return this.http.get<MotivoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de MotivoPago.
   */
  add(datos: any): Observable<MotivoPago | null> {
    return this.http.post<MotivoPago>(ServiciosTsr.RS_PMTV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de MotivoPago.
   */
  update(datos: any): Observable<MotivoPago | null> {
    return this.http.put<MotivoPago>(ServiciosTsr.RS_PMTV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de MotivoPago según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<MotivoPago[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_PMTV}${wsCriteria}`;
    return this.http.post<MotivoPago[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de MotivoPago por su ID.
   */
  delete(id: any): Observable<MotivoPago | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_PMTV}${wsDelete}`;
    return this.http.delete<MotivoPago>(url, this.httpOptions).pipe(
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

