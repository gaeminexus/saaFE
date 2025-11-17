import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleCierre } from '../model/detalle-cierre';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class DetalleCierreService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de DetalleCierre.
   */
  getAll(): Observable<DetalleCierre[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DTCR}${wsGetAll}`;
    return this.http.get<DetalleCierre[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro de DetalleCierre por su ID.
   */
  getById(id: string): Observable<DetalleCierre | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DTCR}${wsGetById}${id}`;
    return this.http.get<DetalleCierre>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro de DetalleCierre.
   */
  add(datos: any): Observable<DetalleCierre | null> {
    return this.http.post<DetalleCierre>(ServiciosTsr.RS_DTCR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente de DetalleCierre.
   */
  update(datos: any): Observable<DetalleCierre | null> {
    return this.http.put<DetalleCierre>(ServiciosTsr.RS_DTCR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros de DetalleCierre según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<DetalleCierre[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_DTCR}${wsCriteria}`;
    return this.http.post<DetalleCierre[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro de DetalleCierre por su ID.
   */
  delete(id: any): Observable<DetalleCierre | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DTCR}${wsDelete}`;
    return this.http.delete<DetalleCierre>(url, this.httpOptions).pipe(
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
