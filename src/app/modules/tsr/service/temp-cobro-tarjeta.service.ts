import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempCobroTarjeta } from '../model/temp-cobro-tarjeta';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempCobroTarjetaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempCobroTarjeta.
   */
  getAll(): Observable<TempCobroTarjeta[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TCTJ}${wsGetAll}`;
    return this.http.get<TempCobroTarjeta[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempCobroTarjeta por su ID.
   */
  getById(id: string): Observable<TempCobroTarjeta | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TCTJ}${wsGetById}${id}`;
    return this.http.get<TempCobroTarjeta>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempCobroTarjeta.
   */
  add(datos: any): Observable<TempCobroTarjeta | null> {
    return this.http.post<TempCobroTarjeta>(ServiciosTsr.RS_TCTJ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempCobroTarjeta.
   */
  update(datos: any): Observable<TempCobroTarjeta | null> {
    return this.http.put<TempCobroTarjeta>(ServiciosTsr.RS_TCTJ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempCobroTarjeta según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempCobroTarjeta[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TCTJ}${wsCriteria}`;
    return this.http.post<TempCobroTarjeta[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempCobroTarjeta por su ID.
   */
  delete(id: any): Observable<TempCobroTarjeta | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TCTJ}${wsDelete}`;
    return this.http.delete<TempCobroTarjeta>(url, this.httpOptions).pipe(
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
