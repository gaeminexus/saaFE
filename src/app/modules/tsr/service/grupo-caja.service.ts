import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { GrupoCaja } from '../model/grupo-caja';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class GrupoCajaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de GrupoCaja.
   */
  getAll(): Observable<GrupoCaja[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CJIN}${wsGetAll}`;
    return this.http.get<GrupoCaja[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de GrupoCaja por su ID.
   */
  getById(id: string): Observable<GrupoCaja | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CJIN}${wsGetById}${id}`;
    return this.http.get<GrupoCaja>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de GrupoCaja.
   */
  add(datos: any): Observable<GrupoCaja | null> {
    return this.http.post<GrupoCaja>(ServiciosTsr.RS_CJIN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de GrupoCaja.
   */
  update(datos: any): Observable<GrupoCaja | null> {
    return this.http.put<GrupoCaja>(ServiciosTsr.RS_CJIN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de GrupoCaja según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<GrupoCaja[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CJIN}${wsCriteria}`;
    return this.http.post<GrupoCaja[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de GrupoCaja por su ID.
   */
  delete(id: any): Observable<GrupoCaja | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CJIN}${wsDelete}`;
    return this.http.delete<GrupoCaja>(url, this.httpOptions).pipe(
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
