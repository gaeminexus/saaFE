import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DebitoCredito } from '../model/debito-credito';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class DebitoCreditoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de DebitoCredito.
   */
  getAll(): Observable<DebitoCredito[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DBCR}${wsGetAll}`;
    return this.http.get<DebitoCredito[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de DebitoCredito por su ID.
   */
  getById(id: string): Observable<DebitoCredito | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DBCR}${wsGetById}${id}`;
    return this.http.get<DebitoCredito>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de DebitoCredito.
   */
  add(datos: any): Observable<DebitoCredito | null> {
    return this.http.post<DebitoCredito>(ServiciosTsr.RS_DBCR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de DebitoCredito.
   */
  update(datos: any): Observable<DebitoCredito | null> {
    return this.http.put<DebitoCredito>(ServiciosTsr.RS_DBCR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de DebitoCredito según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<DebitoCredito[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_DBCR}${wsCriteria}`;
    return this.http.post<DebitoCredito[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de DebitoCredito por su ID.
   */
  delete(id: any): Observable<DebitoCredito | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DBCR}${wsDelete}`;
    return this.http.delete<DebitoCredito>(url, this.httpOptions).pipe(
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
