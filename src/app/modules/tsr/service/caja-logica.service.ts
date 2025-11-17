import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CajaLogica } from '../model/caja-logica';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CajaLogicaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CajaLogica.
   */
  getAll(): Observable<CajaLogica[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CJCN}${wsGetAll}`;
    return this.http.get<CajaLogica[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<CajaLogica | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CJCN}${wsGetById}${id}`;
    return this.http.get<CajaLogica>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<CajaLogica | null> {
    return this.http.post<CajaLogica>(ServiciosTsr.RS_CJCN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<CajaLogica | null> {
    return this.http.put<CajaLogica>(ServiciosTsr.RS_CJCN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CajaLogica[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CJCN}${wsCriteria}`;
    return this.http.post<CajaLogica[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<CajaLogica | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CJCN}${wsDelete}`;
    return this.http.delete<CajaLogica>(url, this.httpOptions).pipe(
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
