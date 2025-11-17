import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CajaFisica } from '../model/caja-fisica';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CajaFisicaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CajaFisica.
   */
  getAll(): Observable<CajaFisica[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CJAA}${wsGetAll}`;
    return this.http.get<CajaFisica[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<CajaFisica | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CJAA}${wsGetById}${id}`;
    return this.http.get<CajaFisica>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<CajaFisica | null> {
    return this.http.post<CajaFisica>(ServiciosTsr.RS_CJAA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<CajaFisica | null> {
    return this.http.put<CajaFisica>(ServiciosTsr.RS_CJAA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CajaFisica[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CJAA}${wsCriteria}`;
    return this.http.post<CajaFisica[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<CajaFisica | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CJAA}${wsDelete}`;
    return this.http.delete<CajaFisica>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Manejo de errores HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
