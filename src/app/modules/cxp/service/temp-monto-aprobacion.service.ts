import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempMontoAprobacion } from '../model/temp_monto_aprobacion'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class TempMontoAprobacionService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempMontoAprobacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_TMNA}${wsGetById}`;
    return this.http.get<TempMontoAprobacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempMontoAprobacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_TMNA}${wsGetById}${id}`;
    return this.http.get<TempMontoAprobacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempMontoAprobacion | null> {
    return this.http.post<TempMontoAprobacion>(ServiciosCxp.RS_TMNA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempMontoAprobacion | null> {
    return this.http.put<TempMontoAprobacion>(ServiciosCxp.RS_TMNA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempMontoAprobacion[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_TMNA}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempMontoAprobacion | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_TMNA}${wsEndpoint}`;
    return this.http.delete<TempMontoAprobacion>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
