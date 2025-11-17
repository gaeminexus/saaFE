import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CierreCaja } from '../model/cierre-caja';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CierreCajaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CierreCaja.
   */
  getAll(): Observable<CierreCaja[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CRCJ}${wsGetAll}`;
    return this.http.get<CierreCaja[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<CierreCaja | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CRCJ}${wsGetById}${id}`;
    return this.http.get<CierreCaja>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<CierreCaja | null> {
    return this.http.post<CierreCaja>(ServiciosTsr.RS_CRCJ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<CierreCaja | null> {
    return this.http.put<CierreCaja>(ServiciosTsr.RS_CRCJ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CierreCaja[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CRCJ}${wsCriteria}`;
    return this.http.post<CierreCaja[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<CierreCaja | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CRCJ}${wsDelete}`;
    return this.http.delete<CierreCaja>(url, this.httpOptions).pipe(
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
