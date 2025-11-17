import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempDebitoCredito } from '../model/temp-debito-credito';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempDebitoCreditoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempDebitoCredito.
   */
  getAll(): Observable<TempDebitoCredito[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TDBC}${wsGetAll}`;
    return this.http.get<TempDebitoCredito[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempDebitoCredito por su ID.
   */
  getById(id: string): Observable<TempDebitoCredito | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TDBC}${wsGetById}${id}`;
    return this.http.get<TempDebitoCredito>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempDebitoCredito.
   */
  add(datos: any): Observable<TempDebitoCredito | null> {
    return this.http.post<TempDebitoCredito>(ServiciosTsr.RS_TDBC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempDebitoCredito.
   */
  update(datos: any): Observable<TempDebitoCredito | null> {
    return this.http.put<TempDebitoCredito>(ServiciosTsr.RS_TDBC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempDebitoCredito según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempDebitoCredito[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TDBC}${wsCriteria}`;
    return this.http.post<TempDebitoCredito[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempDebitoCredito por su ID.
   */
  delete(id: any): Observable<TempDebitoCredito | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TDBC}${wsDelete}`;
    return this.http.delete<TempDebitoCredito>(url, this.httpOptions).pipe(
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

