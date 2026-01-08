import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MontoAprobacion } from '../model/monto_aprobacion'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class MontoAprobacionService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<MontoAprobacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_MNAP}${wsGetById}`;
    return this.http.get<MontoAprobacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<MontoAprobacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_MNAP}${wsGetById}${id}`;
    return this.http.get<MontoAprobacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<MontoAprobacion | null> {
    return this.http.post<MontoAprobacion>(ServiciosCxp.RS_MNAP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<MontoAprobacion | null> {
    return this.http.put<MontoAprobacion>(ServiciosCxp.RS_MNAP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<MontoAprobacion[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_MNAP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<MontoAprobacion | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_MNAP}${wsEndpoint}`;
    return this.http.delete<MontoAprobacion>(url, this.httpOptions).pipe(
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
