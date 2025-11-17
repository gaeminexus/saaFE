import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Deposito } from '../model/deposito';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class DepositoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Deposito.
   */
  getAll(): Observable<Deposito[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DPST}${wsGetAll}`;
    return this.http.get<Deposito[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de Deposito por su ID.
   */
  getById(id: string): Observable<Deposito | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DPST}${wsGetById}${id}`;
    return this.http.get<Deposito>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de Deposito.
   */
  add(datos: any): Observable<Deposito | null> {
    return this.http.post<Deposito>(ServiciosTsr.RS_DPST, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de Deposito.
   */
  update(datos: any): Observable<Deposito | null> {
    return this.http.put<Deposito>(ServiciosTsr.RS_DPST, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de Deposito según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Deposito[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_DPST}${wsCriteria}`;
    return this.http.post<Deposito[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de Deposito por su ID.
   */
  delete(id: any): Observable<Deposito | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DPST}${wsDelete}`;
    return this.http.delete<Deposito>(url, this.httpOptions).pipe(
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
