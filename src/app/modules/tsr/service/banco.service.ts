import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Banco } from '../model/banco';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class BancoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Banco.
   */
  getAll(): Observable<Banco[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_BNCO}${wsGetAll}`;
    return this.http.get<Banco[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<Banco | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_BNCO}${wsGetById}${id}`;
    return this.http.get<Banco>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<Banco | null> {
    return this.http.post<Banco>(ServiciosTsr.RS_BNCO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<Banco | null> {
    return this.http.put<Banco>(ServiciosTsr.RS_BNCO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Banco[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_BNCO}${wsCriteria}`;
    return this.http.post<Banco[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<Banco | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_BNCO}${wsDelete}`;
    return this.http.delete<Banco>(url, this.httpOptions).pipe(
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
