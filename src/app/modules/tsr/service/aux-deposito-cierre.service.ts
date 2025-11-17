import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { AuxDepositoCierre } from '../model/aux-deposito-cierre';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root'
})
export class AuxDepositoCierreService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los registros de AuxDepositoCierre.
   */
  getAll(): Observable<AuxDepositoCierre[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_ACPD}${wsGetAll}`;
    return this.http.get<AuxDepositoCierre[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene un registro por su ID.
   */
  getById(id: string): Observable<AuxDepositoCierre | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_ACPD}${wsGetById}${id}`;
    return this.http.get<AuxDepositoCierre>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<AuxDepositoCierre | null> {
    return this.http.post<AuxDepositoCierre>(ServiciosTsr.RS_ACPD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<AuxDepositoCierre | null> {
    return this.http.put<AuxDepositoCierre>(ServiciosTsr.RS_ACPD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Selecciona registros por criterio.
   */
  selectByCriteria(datos: any): Observable<AuxDepositoCierre[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosTsr.RS_ACPD}${wsCriteria}`;
    return this.http.post<AuxDepositoCierre[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<AuxDepositoCierre | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_ACPD}${wsDelete}`;
    return this.http.delete<AuxDepositoCierre>(url, this.httpOptions).pipe(
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

