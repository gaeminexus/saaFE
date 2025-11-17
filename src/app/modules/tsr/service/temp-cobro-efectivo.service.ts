import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempCobroEfectivo } from '../model/temp-cobro-efectivo';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempCobroEfectivoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempCobroEfectivo.
   */
  getAll(): Observable<TempCobroEfectivo[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TCEF}${wsGetAll}`;
    return this.http.get<TempCobroEfectivo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempCobroEfectivo por su ID.
   */
  getById(id: string): Observable<TempCobroEfectivo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TCEF}${wsGetById}${id}`;
    return this.http.get<TempCobroEfectivo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempCobroEfectivo.
   */
  add(datos: any): Observable<TempCobroEfectivo | null> {
    return this.http.post<TempCobroEfectivo>(ServiciosTsr.RS_TCEF, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempCobroEfectivo.
   */
  update(datos: any): Observable<TempCobroEfectivo | null> {
    return this.http.put<TempCobroEfectivo>(ServiciosTsr.RS_TCEF, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempCobroEfectivo según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempCobroEfectivo[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TCEF}${wsCriteria}`;
    return this.http.post<TempCobroEfectivo[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempCobroEfectivo por su ID.
   */
  delete(id: any): Observable<TempCobroEfectivo | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TCEF}${wsDelete}`;
    return this.http.delete<TempCobroEfectivo>(url, this.httpOptions).pipe(
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
