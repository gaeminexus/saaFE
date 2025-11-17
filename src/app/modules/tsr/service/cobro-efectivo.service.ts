import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CobroEfectivo } from '../model/cobro-efectivo';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CobroEfectivoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CobroEfectivo.
   */
  getAll(): Observable<CobroEfectivo[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CEFC}${wsGetAll}`;
    return this.http.get<CobroEfectivo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<CobroEfectivo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CEFC}${wsGetById}${id}`;
    return this.http.get<CobroEfectivo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de CobroEfectivo.
   */
  add(datos: any): Observable<CobroEfectivo | null> {
    return this.http.post<CobroEfectivo>(ServiciosTsr.RS_CEFC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de CobroEfectivo.
   */
  update(datos: any): Observable<CobroEfectivo | null> {
    return this.http.put<CobroEfectivo>(ServiciosTsr.RS_CEFC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros por criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CobroEfectivo[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CEFC}${wsCriteria}`;
    return this.http.post<CobroEfectivo[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<CobroEfectivo | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CEFC}${wsDelete}`;
    return this.http.delete<CobroEfectivo>(url, this.httpOptions).pipe(
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
