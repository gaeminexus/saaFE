import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MovimientoBanco } from '../model/movimiento-banco';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class MovimientoBancoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de MovimientoBanco.
   */
  getAll(): Observable<MovimientoBanco[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_MVCB}${wsGetAll}`;
    return this.http.get<MovimientoBanco[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de MovimientoBanco por su ID.
   */
  getById(id: string): Observable<MovimientoBanco | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_MVCB}${wsGetById}${id}`;
    return this.http.get<MovimientoBanco>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de MovimientoBanco.
   */
  add(datos: any): Observable<MovimientoBanco | null> {
    return this.http.post<MovimientoBanco>(ServiciosTsr.RS_MVCB, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de MovimientoBanco.
   */
  update(datos: any): Observable<MovimientoBanco | null> {
    return this.http.put<MovimientoBanco>(ServiciosTsr.RS_MVCB, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de MovimientoBanco según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<MovimientoBanco[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_MVCB}${wsCriteria}`;
    return this.http.post<MovimientoBanco[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de MovimientoBanco por su ID.
   */
  delete(id: any): Observable<MovimientoBanco | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_MVCB}${wsDelete}`;
    return this.http.delete<MovimientoBanco>(url, this.httpOptions).pipe(
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

