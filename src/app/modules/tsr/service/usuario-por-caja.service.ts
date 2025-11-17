import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { UsuarioPorCaja } from '../model/usuario-por-caja';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class UsuarioPorCajaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de UsuarioPorCaja.
   */
  getAll(): Observable<UsuarioPorCaja[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_USXC}${wsGetAll}`;
    return this.http.get<UsuarioPorCaja[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de UsuarioPorCaja por su ID.
   */
  getById(id: string): Observable<UsuarioPorCaja | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_USXC}${wsGetById}${id}`;
    return this.http.get<UsuarioPorCaja>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de UsuarioPorCaja.
   */
  add(datos: any): Observable<UsuarioPorCaja | null> {
    return this.http.post<UsuarioPorCaja>(ServiciosTsr.RS_USXC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de UsuarioPorCaja.
   */
  update(datos: any): Observable<UsuarioPorCaja | null> {
    return this.http.put<UsuarioPorCaja>(ServiciosTsr.RS_USXC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de UsuarioPorCaja según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<UsuarioPorCaja[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_USXC}${wsCriteria}`;
    return this.http.post<UsuarioPorCaja[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de UsuarioPorCaja por su ID.
   */
  delete(id: any): Observable<UsuarioPorCaja | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_USXC}${wsDelete}`;
    return this.http.delete<UsuarioPorCaja>(url, this.httpOptions).pipe(
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

