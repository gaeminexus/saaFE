import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { SaldoBanco } from '../model/saldo-banco';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class SaldoBancoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de SaldoBanco.
   */
  getAll(): Observable<SaldoBanco[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_SLCB}${wsGetAll}`;
    return this.http.get<SaldoBanco[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de SaldoBanco por su ID.
   */
  getById(id: string): Observable<SaldoBanco | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_SLCB}${wsGetById}${id}`;
    return this.http.get<SaldoBanco>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de SaldoBanco.
   */
  add(datos: any): Observable<SaldoBanco | null> {
    return this.http.post<SaldoBanco>(ServiciosTsr.RS_SLCB, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de SaldoBanco.
   */
  update(datos: any): Observable<SaldoBanco | null> {
    return this.http.put<SaldoBanco>(ServiciosTsr.RS_SLCB, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de SaldoBanco según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<SaldoBanco[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_SLCB}${wsCriteria}`;
    return this.http.post<SaldoBanco[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de SaldoBanco por su ID.
   */
  delete(id: any): Observable<SaldoBanco | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_SLCB}${wsDelete}`;
    return this.http.delete<SaldoBanco>(url, this.httpOptions).pipe(
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
