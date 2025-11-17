import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TelefonoDireccion } from '../model/telefono-direccion';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class TelefonoDireccionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de TelefonoDireccion.
   */
  getAll(): Observable<TelefonoDireccion[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_PCNT}${wsGetAll}`;
    return this.http.get<TelefonoDireccion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de TelefonoDireccion por su ID.
   */
  getById(id: string): Observable<TelefonoDireccion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_PCNT}${wsGetById}${id}`;
    return this.http.get<TelefonoDireccion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de TelefonoDireccion.
   */
  add(datos: any): Observable<TelefonoDireccion | null> {
    return this.http.post<TelefonoDireccion>(ServiciosTsr.RS_PCNT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de TelefonoDireccion.
   */
  update(datos: any): Observable<TelefonoDireccion | null> {
    return this.http.put<TelefonoDireccion>(ServiciosTsr.RS_PCNT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de TelefonoDireccion según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<TelefonoDireccion[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_PCNT}${wsCriteria}`;
    return this.http.post<TelefonoDireccion[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de TelefonoDireccion por su ID.
   */
  delete(id: any): Observable<TelefonoDireccion | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_PCNT}${wsDelete}`;
    return this.http.delete<TelefonoDireccion>(url, this.httpOptions).pipe(
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

