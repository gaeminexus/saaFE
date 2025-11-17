import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CajaLogicaPorCajaFisica } from '../model/caja-logica-por-caja-fisica';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class CajaLogicaPorCajaFisicaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de CajaLogicaPorCajaFisica.
   */
  getAll(): Observable<CajaLogicaPorCajaFisica[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CCXC}${wsGetAll}`;
    return this.http.get<CajaLogicaPorCajaFisica[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<CajaLogicaPorCajaFisica | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CCXC}${wsGetById}${id}`;
    return this.http.get<CajaLogicaPorCajaFisica>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<CajaLogicaPorCajaFisica | null> {
    return this.http.post<CajaLogicaPorCajaFisica>(ServiciosTsr.RS_CCXC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<CajaLogicaPorCajaFisica | null> {
    return this.http.put<CajaLogicaPorCajaFisica>(ServiciosTsr.RS_CCXC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<CajaLogicaPorCajaFisica[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_CCXC}${wsCriteria}`;
    return this.http.post<CajaLogicaPorCajaFisica[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<CajaLogicaPorCajaFisica | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CCXC}${wsDelete}`;
    return this.http.delete<CajaLogicaPorCajaFisica>(url, this.httpOptions).pipe(
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
