import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CobroRetencion } from '../model/cobro-retencion';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CobroRetencionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CobroRetencion.
   */
  getAll(): Observable<CobroRetencion[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CRTN}${wsGetAll}`;
    return this.http.get<CobroRetencion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<CobroRetencion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CRTN}${wsGetById}${id}`;
    return this.http.get<CobroRetencion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de CobroRetencion.
   */
  add(datos: any): Observable<CobroRetencion | null> {
    return this.http.post<CobroRetencion>(ServiciosTsr.RS_CRTN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de CobroRetencion.
   */
  update(datos: any): Observable<CobroRetencion | null> {
    return this.http.put<CobroRetencion>(ServiciosTsr.RS_CRTN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CobroRetencion[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CRTN}${wsCriteria}`;
    return this.http.post<CobroRetencion[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<CobroRetencion | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CRTN}${wsDelete}`;
    return this.http.delete<CobroRetencion>(url, this.httpOptions).pipe(
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
