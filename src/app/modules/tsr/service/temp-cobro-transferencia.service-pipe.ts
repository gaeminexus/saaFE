import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempCobroTransferencia } from '../model/temp-cobro-transferencia';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempCobroTransferenciaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempCobroTransferencia.
   */
  getAll(): Observable<TempCobroTransferencia[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TCTR}${wsGetAll}`;
    return this.http.get<TempCobroTransferencia[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempCobroTransferencia por su ID.
   */
  getById(id: string): Observable<TempCobroTransferencia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TCTR}${wsGetById}${id}`;
    return this.http.get<TempCobroTransferencia>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempCobroTransferencia.
   */
  add(datos: any): Observable<TempCobroTransferencia | null> {
    return this.http.post<TempCobroTransferencia>(ServiciosTsr.RS_TCTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempCobroTransferencia.
   */
  update(datos: any): Observable<TempCobroTransferencia | null> {
    return this.http.put<TempCobroTransferencia>(ServiciosTsr.RS_TCTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempCobroTransferencia según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempCobroTransferencia[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TCTR}${wsCriteria}`;
    return this.http.post<TempCobroTransferencia[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempCobroTransferencia por su ID.
   */
  delete(id: any): Observable<TempCobroTransferencia | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TCTR}${wsDelete}`;
    return this.http.delete<TempCobroTransferencia>(url, this.httpOptions).pipe(
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

