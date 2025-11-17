import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Chequera } from '../model/chequera';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class ChequeraService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Chequera.
   */
  getAll(): Observable<Chequera[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CHQR}${wsGetAll}`;
    return this.http.get<Chequera[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<Chequera | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CHQR}${wsGetById}${id}`;
    return this.http.get<Chequera>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<Chequera | null> {
    return this.http.post<Chequera>(ServiciosTsr.RS_CHQR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<Chequera | null> {
    return this.http.put<Chequera>(ServiciosTsr.RS_CHQR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Chequera[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CHQR}${wsCriteria}`;
    return this.http.post<Chequera[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<Chequera | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CHQR}${wsDelete}`;
    return this.http.delete<Chequera>(url, this.httpOptions).pipe(
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
