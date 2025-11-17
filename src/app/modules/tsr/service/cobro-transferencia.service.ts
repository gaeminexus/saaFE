import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CobroTransferencia } from '../model/cobro-transferencia';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CobroTransferenciaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CobroTransferencia.
   */
  getAll(): Observable<CobroTransferencia[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CTRN}${wsGetAll}`;
    return this.http.get<CobroTransferencia[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de CobroTransferencia por su ID.
   */
  getById(id: string): Observable<CobroTransferencia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CTRN}${wsGetById}${id}`;
    return this.http.get<CobroTransferencia>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de CobroTransferencia.
   */
  add(datos: any): Observable<CobroTransferencia | null> {
    return this.http.post<CobroTransferencia>(ServiciosTsr.RS_CTRN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de CobroTransferencia.
   */
  update(datos: any): Observable<CobroTransferencia | null> {
    return this.http.put<CobroTransferencia>(ServiciosTsr.RS_CTRN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de CobroTransferencia según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CobroTransferencia[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CTRN}${wsCriteria}`;
    return this.http.post<CobroTransferencia[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de CobroTransferencia por su ID.
   */
  delete(id: any): Observable<CobroTransferencia | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CTRN}${wsDelete}`;
    return this.http.delete<CobroTransferencia>(url, this.httpOptions).pipe(
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

