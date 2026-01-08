import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempAprobacionXMonto } from '../model/temp_aprobacion_x_monto'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class TempAprobacionXMontoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempAprobacionXMonto[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_TAPX}${wsGetById}`;
    return this.http.get<TempAprobacionXMonto[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempAprobacionXMonto | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_TAPX}${wsGetById}${id}`;
    return this.http.get<TempAprobacionXMonto>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempAprobacionXMonto | null> {
    return this.http.post<TempAprobacionXMonto>(ServiciosCxp.RS_TAPX, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempAprobacionXMonto | null> {
    return this.http.put<TempAprobacionXMonto>(ServiciosCxp.RS_TAPX, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempAprobacionXMonto[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_TAPX}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempAprobacionXMonto | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_TAPX}${wsEndpoint}`;
    return this.http.delete<TempAprobacionXMonto>(url, this.httpOptions).pipe(
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
