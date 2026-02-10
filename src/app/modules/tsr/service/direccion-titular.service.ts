import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DireccionTitular } from '../model/direccion-titular';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class DireccionTitularService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de DireccionTitular.
   */
  getAll(): Observable<DireccionTitular[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_PDRC}${wsGetAll}`;
    return this.http.get<DireccionTitular[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de DireccionTitular por su ID.
   */
  getById(id: string): Observable<DireccionTitular | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_PDRC}${wsGetById}${id}`;
    return this.http.get<DireccionTitular>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de DireccionTitular.
   */
  add(datos: any): Observable<DireccionTitular | null> {
    return this.http.post<DireccionTitular>(ServiciosTsr.RS_PDRC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de DireccionTitular.
   */
  update(datos: any): Observable<DireccionTitular | null> {
    return this.http.put<DireccionTitular>(ServiciosTsr.RS_PDRC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de DireccionTitular según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<DireccionTitular[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_PDRC}${wsCriteria}`;
    return this.http.post<DireccionTitular[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de DireccionTitular por su ID.
   */
  delete(id: any): Observable<DireccionTitular | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_PDRC}${wsDelete}`;
    return this.http.delete<DireccionTitular>(url, this.httpOptions).pipe(
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

