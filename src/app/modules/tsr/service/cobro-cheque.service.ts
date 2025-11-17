import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CobroCheque } from '../model/cobro-cheque';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CobroChequeService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CobroCheque.
   */
  getAll(): Observable<CobroCheque[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CCHQ}${wsGetAll}`;
    return this.http.get<CobroCheque[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<CobroCheque | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CCHQ}${wsGetById}${id}`;
    return this.http.get<CobroCheque>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<CobroCheque | null> {
    return this.http.post<CobroCheque>(ServiciosTsr.RS_CCHQ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<CobroCheque | null> {
    return this.http.put<CobroCheque>(ServiciosTsr.RS_CCHQ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CobroCheque[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CCHQ}${wsCriteria}`;
    return this.http.post<CobroCheque[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<CobroCheque | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CCHQ}${wsDelete}`;
    return this.http.delete<CobroCheque>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Manejo de errores HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
