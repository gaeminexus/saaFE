import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DesgloseDetalleDeposito } from '../model/desglose-detalle-deposito';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class DesgloseDetalleDepositoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de DesgloseDetalleDeposito.
   */
  getAll(): Observable<DesgloseDetalleDeposito[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DSDT}${wsGetAll}`;
    return this.http.get<DesgloseDetalleDeposito[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de DesgloseDetalleDeposito por su ID.
   */
  getById(id: string): Observable<DesgloseDetalleDeposito | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DSDT}${wsGetById}${id}`;
    return this.http.get<DesgloseDetalleDeposito>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de DesgloseDetalleDeposito.
   */
  add(datos: any): Observable<DesgloseDetalleDeposito | null> {
    return this.http.post<DesgloseDetalleDeposito>(ServiciosTsr.RS_DSDT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de DesgloseDetalleDeposito.
   */
  update(datos: any): Observable<DesgloseDetalleDeposito | null> {
    return this.http.put<DesgloseDetalleDeposito>(ServiciosTsr.RS_DSDT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de DesgloseDetalleDeposito según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<DesgloseDetalleDeposito[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_DSDT}${wsCriteria}`;
    return this.http.post<DesgloseDetalleDeposito[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de DesgloseDetalleDeposito por su ID.
   */
  delete(id: any): Observable<DesgloseDetalleDeposito | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DSDT}${wsDelete}`;
    return this.http.delete<DesgloseDetalleDeposito>(url, this.httpOptions).pipe(
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

