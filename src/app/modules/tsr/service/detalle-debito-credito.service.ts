import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleDebitoCredito } from '../model/detalle-debito-credito';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class DetalleDebitoCreditoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de DetalleDebitoCredito.
   */
  getAll(): Observable<DetalleDebitoCredito[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DTDC}${wsGetAll}`;
    return this.http.get<DetalleDebitoCredito[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de DetalleDebitoCredito por su ID.
   */
  getById(id: string): Observable<DetalleDebitoCredito | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DTDC}${wsGetById}${id}`;
    return this.http.get<DetalleDebitoCredito>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de DetalleDebitoCredito.
   */
  add(datos: any): Observable<DetalleDebitoCredito | null> {
    return this.http.post<DetalleDebitoCredito>(ServiciosTsr.RS_DTDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de DetalleDebitoCredito.
   */
  update(datos: any): Observable<DetalleDebitoCredito | null> {
    return this.http.put<DetalleDebitoCredito>(ServiciosTsr.RS_DTDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de DetalleDebitoCredito según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<DetalleDebitoCredito[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_DTDC}${wsCriteria}`;
    return this.http.post<DetalleDebitoCredito[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de DetalleDebitoCredito por su ID.
   */
  delete(id: any): Observable<DetalleDebitoCredito | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DTDC}${wsDelete}`;
    return this.http.delete<DetalleDebitoCredito>(url, this.httpOptions).pipe(
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
