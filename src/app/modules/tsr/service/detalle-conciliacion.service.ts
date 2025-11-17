import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleConciliacion } from '../model/detalle-conciliacion';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class DetalleConciliacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de DetalleConciliacion.
   */
  getAll(): Observable<DetalleConciliacion[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DTCL}${wsGetAll}`;
    return this.http.get<DetalleConciliacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de DetalleConciliacion por su ID.
   */
  getById(id: string): Observable<DetalleConciliacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DTCL}${wsGetById}${id}`;
    return this.http.get<DetalleConciliacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de DetalleConciliacion.
   */
  add(datos: any): Observable<DetalleConciliacion | null> {
    return this.http.post<DetalleConciliacion>(ServiciosTsr.RS_DTCL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de DetalleConciliacion.
   */
  update(datos: any): Observable<DetalleConciliacion | null> {
    return this.http.put<DetalleConciliacion>(ServiciosTsr.RS_DTCL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de DetalleConciliacion según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<DetalleConciliacion[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_DTCL}${wsCriteria}`;
    return this.http.post<DetalleConciliacion[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de DetalleConciliacion por su ID.
   */
  delete(id: any): Observable<DetalleConciliacion | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DTCL}${wsDelete}`;
    return this.http.delete<DetalleConciliacion>(url, this.httpOptions).pipe(
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
