import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { AprobacionXMonto } from '../model/aprobacion_x_monto'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class AprobacionXMontoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<AprobacionXMonto[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_APXM}${wsGetById}`;
    return this.http.get<AprobacionXMonto[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<AprobacionXMonto | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_APXM}${wsGetById}${id}`;
    return this.http.get<AprobacionXMonto>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<AprobacionXMonto | null> {
    return this.http.post<AprobacionXMonto>(ServiciosCxp.RS_APXM, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<AprobacionXMonto | null> {
    return this.http.put<AprobacionXMonto>(ServiciosCxp.RS_APXM, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<AprobacionXMonto[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_APXM}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<AprobacionXMonto | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_APXM}${wsEndpoint}`;
    return this.http.delete<AprobacionXMonto>(url, this.httpOptions).pipe(
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
