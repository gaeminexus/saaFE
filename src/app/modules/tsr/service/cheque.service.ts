import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Cheque } from '../model/cheque';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class ChequeService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Cheque.
   */
  getAll(): Observable<Cheque[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DTCH}${wsGetAll}`;
    return this.http.get<Cheque[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<Cheque | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DTCH}${wsGetById}${id}`;
    return this.http.get<Cheque>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<Cheque | null> {
    return this.http
      .post<Cheque>(ServiciosTsr.RS_DTCH, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<Cheque | null> {
    return this.http
      .put<Cheque>(ServiciosTsr.RS_DTCH, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Cheque[] | null> {
    const wsCriteria = '/selectByCriteria/';
    const url = `${ServiciosTsr.RS_DTCH}${wsCriteria}`;
    return this.http
      .post<Cheque[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<Cheque | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DTCH}${wsDelete}`;
    return this.http.delete<Cheque>(url, this.httpOptions).pipe(catchError(this.handleError));
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
