import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempPago } from '../model/temp-pago';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempPagoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempPago.
   */
  getAll(): Observable<TempPago[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TPGS}${wsGetAll}`;
    return this.http.get<TempPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempPago por su ID.
   */
  getById(id: string): Observable<TempPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TPGS}${wsGetById}${id}`;
    return this.http.get<TempPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempPago.
   */
  add(datos: any): Observable<TempPago | null> {
    return this.http.post<TempPago>(ServiciosTsr.RS_TPGS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempPago.
   */
  update(datos: any): Observable<TempPago | null> {
    return this.http.put<TempPago>(ServiciosTsr.RS_TPGS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempPago según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempPago[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TPGS}${wsCriteria}`;
    return this.http.post<TempPago[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempPago por su ID.
   */
  delete(id: any): Observable<TempPago | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TPGS}${wsDelete}`;
    return this.http.delete<TempPago>(url, this.httpOptions).pipe(
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

