import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleDeposito } from '../model/detalle-deposito';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class DetalleDepositoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de DetalleDeposito.
   */
  getAll(): Observable<DetalleDeposito[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DTDP}${wsGetAll}`;
    return this.http.get<DetalleDeposito[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de DetalleDeposito por su ID.
   */
  getById(id: string): Observable<DetalleDeposito | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DTDP}${wsGetById}${id}`;
    return this.http.get<DetalleDeposito>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de DetalleDeposito.
   */
  add(datos: any): Observable<DetalleDeposito | null> {
    return this.http.post<DetalleDeposito>(ServiciosTsr.RS_DTDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de DetalleDeposito.
   */
  update(datos: any): Observable<DetalleDeposito | null> {
    return this.http.put<DetalleDeposito>(ServiciosTsr.RS_DTDP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de DetalleDeposito según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<DetalleDeposito[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_DTDP}${wsCriteria}`;
    return this.http.post<DetalleDeposito[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de DetalleDeposito por su ID.
   */
  delete(id: any): Observable<DetalleDeposito | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DTDP}${wsDelete}`;
    return this.http.delete<DetalleDeposito>(url, this.httpOptions).pipe(
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

