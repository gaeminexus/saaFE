import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CobroTarjeta } from '../model/cobro-tarjeta';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CobroTarjetaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CobroTarjeta.
   */
  getAll(): Observable<CobroTarjeta[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CTRJ}${wsGetAll}`;
    return this.http.get<CobroTarjeta[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de CobroTarjeta por su ID.
   */
  getById(id: string): Observable<CobroTarjeta | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CTRJ}${wsGetById}${id}`;
    return this.http.get<CobroTarjeta>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de CobroTarjeta.
   */
  add(datos: any): Observable<CobroTarjeta | null> {
    return this.http.post<CobroTarjeta>(ServiciosTsr.RS_CTRJ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de CobroTarjeta.
   */
  update(datos: any): Observable<CobroTarjeta | null> {
    return this.http.put<CobroTarjeta>(ServiciosTsr.RS_CTRJ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de CobroTarjeta según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CobroTarjeta[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CTRJ}${wsCriteria}`;
    return this.http.post<CobroTarjeta[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de CobroTarjeta por su ID.
   */
  delete(id: any): Observable<CobroTarjeta | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CTRJ}${wsDelete}`;
    return this.http.delete<CobroTarjeta>(url, this.httpOptions).pipe(
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
