import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MotivoCobro } from '../model/motivo-cobro';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class MotivoCobroService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de MotivoCobro.
   */
  getAll(): Observable<MotivoCobro[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CMTV}${wsGetAll}`;
    return this.http.get<MotivoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de MotivoCobro por su ID.
   */
  getById(id: string): Observable<MotivoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CMTV}${wsGetById}${id}`;
    return this.http.get<MotivoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de MotivoCobro.
   */
  add(datos: any): Observable<MotivoCobro | null> {
    return this.http.post<MotivoCobro>(ServiciosTsr.RS_CMTV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de MotivoCobro.
   */
  update(datos: any): Observable<MotivoCobro | null> {
    return this.http.put<MotivoCobro>(ServiciosTsr.RS_CMTV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de MotivoCobro según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<MotivoCobro[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CMTV}${wsCriteria}`;
    return this.http.post<MotivoCobro[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de MotivoCobro por su ID.
   */
  delete(id: any): Observable<MotivoCobro | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CMTV}${wsDelete}`;
    return this.http.delete<MotivoCobro>(url, this.httpOptions).pipe(
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
