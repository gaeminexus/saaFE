import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { BancoExterno } from '../model/banco-externo.model';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class BancoExternoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los registros de BancoExterno.
   */
  getAll(): Observable<BancoExterno[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_BEXT}${wsGetAll}`;
    return this.http.get<BancoExterno[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Obtiene un registro por su ID.
   */
  getById(id: string): Observable<BancoExterno | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_BEXT}${wsGetById}${id}`;
    return this.http.get<BancoExterno>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<BancoExterno | null> {
    return this.http
      .post<BancoExterno>(ServiciosTsr.RS_BEXT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<BancoExterno | null> {
    return this.http
      .put<BancoExterno>(ServiciosTsr.RS_BEXT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros por criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<BancoExterno[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_BEXT}${wsCriteria}`;
    return this.http
      .post<BancoExterno[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<BancoExterno | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_BEXT}${wsDelete}`;
    return this.http.delete<BancoExterno>(url, this.httpOptions).pipe(catchError(this.handleError));
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
