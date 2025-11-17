import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Cobro } from '../model/cobro';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CobroService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Cobro.
   */
  getAll(): Observable<Cobro[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CBRO}${wsGetAll}`;
    return this.http.get<Cobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de Cobro por su ID.
   */
  getById(id: string): Observable<Cobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CBRO}${wsGetById}${id}`;
    return this.http.get<Cobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de Cobro.
   */
  add(datos: any): Observable<Cobro | null> {
    return this.http.post<Cobro>(ServiciosTsr.RS_CBRO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de Cobro.
   */
  update(datos: any): Observable<Cobro | null> {
    return this.http.put<Cobro>(ServiciosTsr.RS_CBRO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros por criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Cobro[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CBRO}${wsCriteria}`;
    return this.http.post<Cobro[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de Cobro por su ID.
   */
  delete(id: any): Observable<Cobro | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CBRO}${wsDelete}`;
    return this.http.delete<Cobro>(url, this.httpOptions).pipe(
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
