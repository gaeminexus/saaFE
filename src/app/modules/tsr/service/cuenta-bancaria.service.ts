import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CuentaBancaria } from '../model/cuenta-bancaria';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class CuentaBancariaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CuentaBancaria.
   */
  getAll(): Observable<CuentaBancaria[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CNBC}${wsGetAll}`;
    return this.http.get<CuentaBancaria[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un registro de CuentaBancaria por su ID.
   */
  getById(id: string): Observable<CuentaBancaria | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CNBC}${wsGetById}${id}`;
    return this.http.get<CuentaBancaria>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea un nuevo registro de CuentaBancaria.
   */
  add(datos: any): Observable<CuentaBancaria | null> {
    return this.http
      .post<CuentaBancaria>(ServiciosTsr.RS_CNBC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza un registro existente de CuentaBancaria.
   */
  update(datos: any): Observable<CuentaBancaria | null> {
    return this.http
      .put<CuentaBancaria>(ServiciosTsr.RS_CNBC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros de CuentaBancaria según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CuentaBancaria[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CNBC}${wsCriteria}`;
    return this.http
      .post<CuentaBancaria[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina un registro de CuentaBancaria por su ID.
   */
  delete(id: any): Observable<CuentaBancaria | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CNBC}${wsDelete}`;
    return this.http
      .delete<CuentaBancaria>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Manejo centralizado de errores HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      // Propagar el HttpErrorResponse completo para facilitar el diagnóstico (status, url)
      return throwError(() => error);
    }
  }
}
