import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempCobroCheque } from '../model/temp-cobro-cheque';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempCobroChequeService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempCobroCheque.
   */
  getAll(): Observable<TempCobroCheque[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TCCH}${wsGetAll}`;
    return this.http.get<TempCobroCheque[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempCobroCheque por su ID.
   */
  getById(id: string): Observable<TempCobroCheque | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TCCH}${wsGetById}${id}`;
    return this.http.get<TempCobroCheque>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempCobroCheque.
   */
  add(datos: any): Observable<TempCobroCheque | null> {
    return this.http.post<TempCobroCheque>(ServiciosTsr.RS_TCCH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempCobroCheque.
   */
  update(datos: any): Observable<TempCobroCheque | null> {
    return this.http.put<TempCobroCheque>(ServiciosTsr.RS_TCCH, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempCobroCheque según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempCobroCheque[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TCCH}${wsCriteria}`;
    return this.http.post<TempCobroCheque[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempCobroCheque por su ID.
   */
  delete(id: any): Observable<TempCobroCheque | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TCCH}${wsDelete}`;
    return this.http.delete<TempCobroCheque>(url, this.httpOptions).pipe(
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
