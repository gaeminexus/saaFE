import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempMotivoPago } from '../model/temp-motivo-pago';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempMotivoPagoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempMotivoPago.
   */
  getAll(): Observable<TempMotivoPago[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TPMT}${wsGetAll}`;
    return this.http.get<TempMotivoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempMotivoPago por su ID.
   */
  getById(id: string): Observable<TempMotivoPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TPMT}${wsGetById}${id}`;
    return this.http.get<TempMotivoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempMotivoPago.
   */
  add(datos: any): Observable<TempMotivoPago | null> {
    return this.http.post<TempMotivoPago>(ServiciosTsr.RS_TPMT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempMotivoPago.
   */
  update(datos: any): Observable<TempMotivoPago | null> {
    return this.http.put<TempMotivoPago>(ServiciosTsr.RS_TPMT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempMotivoPago según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempMotivoPago[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TPMT}${wsCriteria}`;
    return this.http.post<TempMotivoPago[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempMotivoPago por su ID.
   */
  delete(id: any): Observable<TempMotivoPago | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TPMT}${wsDelete}`;
    return this.http.delete<TempMotivoPago>(url, this.httpOptions).pipe(
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
