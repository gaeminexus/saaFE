import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { AuxDepositoDesglose } from '../model/aux-deposito-desglose';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class AuxDepositoDesgloseService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los registros de AuxDepositoDesglose.
   */
  getAll(): Observable<AuxDepositoDesglose[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_APDS}${wsGetAll}`;
    return this.http.get<AuxDepositoDesglose[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene un registro por su ID.
   */
  getById(id: string): Observable<AuxDepositoDesglose | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_APDS}${wsGetById}${id}`;
    return this.http.get<AuxDepositoDesglose>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<AuxDepositoDesglose | null> {
    return this.http.post<AuxDepositoDesglose>(ServiciosTsr.RS_APDS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<AuxDepositoDesglose | null> {
    return this.http.put<AuxDepositoDesglose>(ServiciosTsr.RS_APDS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros por criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<AuxDepositoDesglose[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_APDS}${wsCriteria}`;
    return this.http.post<AuxDepositoDesglose[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<AuxDepositoDesglose | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_APDS}${wsDelete}`;
    return this.http.delete<AuxDepositoDesglose>(url, this.httpOptions).pipe(
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
