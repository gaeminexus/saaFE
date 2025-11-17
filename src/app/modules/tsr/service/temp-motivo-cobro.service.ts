import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempMotivoCobro } from '../model/temp-motivo-cobro';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TempMotivoCobroService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TempMotivoCobro.
   */
  getAll(): Observable<TempMotivoCobro[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_TCMT}${wsGetAll}`;
    return this.http.get<TempMotivoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TempMotivoCobro por su ID.
   */
  getById(id: string): Observable<TempMotivoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_TCMT}${wsGetById}${id}`;
    return this.http.get<TempMotivoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TempMotivoCobro.
   */
  add(datos: any): Observable<TempMotivoCobro | null> {
    return this.http.post<TempMotivoCobro>(ServiciosTsr.RS_TCMT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TempMotivoCobro.
   */
  update(datos: any): Observable<TempMotivoCobro | null> {
    return this.http.put<TempMotivoCobro>(ServiciosTsr.RS_TCMT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TempMotivoCobro según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TempMotivoCobro[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_TCMT}${wsCriteria}`;
    return this.http.post<TempMotivoCobro[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TempMotivoCobro por su ID.
   */
  delete(id: any): Observable<TempMotivoCobro | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_TCMT}${wsDelete}`;
    return this.http.delete<TempMotivoCobro>(url, this.httpOptions).pipe(
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
