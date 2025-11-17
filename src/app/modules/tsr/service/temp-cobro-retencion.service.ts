import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempCobroRetencion } from '../model/temp-cobro-retencion';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempCobroRetencionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempCobroRetencion.
   */
  getAll(): Observable<TempCobroRetencion[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TCRT}${wsGetAll}`;
    return this.http.get<TempCobroRetencion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempCobroRetencion por su ID.
   */
  getById(id: string): Observable<TempCobroRetencion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TCRT}${wsGetById}${id}`;
    return this.http.get<TempCobroRetencion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempCobroRetencion.
   */
  add(datos: any): Observable<TempCobroRetencion | null> {
    return this.http.post<TempCobroRetencion>(ServiciosTsr.RS_TCRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempCobroRetencion.
   */
  update(datos: any): Observable<TempCobroRetencion | null> {
    return this.http.put<TempCobroRetencion>(ServiciosTsr.RS_TCRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempCobroRetencion según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempCobroRetencion[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TCRT}${wsCriteria}`;
    return this.http.post<TempCobroRetencion[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempCobroRetencion por su ID.
   */
  delete(id: any): Observable<TempCobroRetencion | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TCRT}${wsDelete}`;
    return this.http.delete<TempCobroRetencion>(url, this.httpOptions).pipe(
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
