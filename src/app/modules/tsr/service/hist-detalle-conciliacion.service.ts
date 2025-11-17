import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HistDetalleConciliacion } from '../model/hist-detalle-conciliacion';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class HistDetalleConciliacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de HistDetalleConciliacion.
   */
  getAll(): Observable<HistDetalleConciliacion[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DCHI}${wsGetAll}`;
    return this.http.get<HistDetalleConciliacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de HistDetalleConciliacion por su ID.
   */
  getById(id: string): Observable<HistDetalleConciliacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DCHI}${wsGetById}${id}`;
    return this.http.get<HistDetalleConciliacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de HistDetalleConciliacion.
   */
  add(datos: any): Observable<HistDetalleConciliacion | null> {
    return this.http.post<HistDetalleConciliacion>(ServiciosTsr.RS_DCHI, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de HistDetalleConciliacion.
   */
  update(datos: any): Observable<HistDetalleConciliacion | null> {
    return this.http.put<HistDetalleConciliacion>(ServiciosTsr.RS_DCHI, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de HistDetalleConciliacion según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<HistDetalleConciliacion[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_DCHI}${wsCriteria}`;
    return this.http.post<HistDetalleConciliacion[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de HistDetalleConciliacion por su ID.
   */
  delete(id: any): Observable<HistDetalleConciliacion | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DCHI}${wsDelete}`;
    return this.http.delete<HistDetalleConciliacion>(url, this.httpOptions).pipe(
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
