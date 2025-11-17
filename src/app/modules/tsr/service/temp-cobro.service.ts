import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempCobro } from '../model/temp-cobro';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempCobroService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempCobro.
   */
  getAll(): Observable<TempCobro[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TCBR}${wsGetAll}`;
    return this.http.get<TempCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempCobro por su ID.
   */
  getById(id: string): Observable<TempCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TCBR}${wsGetById}${id}`;
    return this.http.get<TempCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempCobro.
   */
  add(datos: any): Observable<TempCobro | null> {
    return this.http.post<TempCobro>(ServiciosTsr.RS_TCBR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempCobro.
   */
  update(datos: any): Observable<TempCobro | null> {
    return this.http.put<TempCobro>(ServiciosTsr.RS_TCBR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempCobro según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempCobro[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TCBR}${wsCriteria}`;
    return this.http.post<TempCobro[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempCobro por su ID.
   */
  delete(id: any): Observable<TempCobro | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TCBR}${wsDelete}`;
    return this.http.delete<TempCobro>(url, this.httpOptions).pipe(
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
