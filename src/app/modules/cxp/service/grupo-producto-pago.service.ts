import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { GrupoProductoPago } from '../model/grupo_producto_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class GrupoProductoPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<GrupoProductoPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_GRPP}${wsGetById}`;
    return this.http.get<GrupoProductoPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<GrupoProductoPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_GRPP}${wsGetById}${id}`;
    return this.http.get<GrupoProductoPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<GrupoProductoPago | null> {
    return this.http.post<GrupoProductoPago>(ServiciosCxp.RS_GRPP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<GrupoProductoPago | null> {
    return this.http.put<GrupoProductoPago>(ServiciosCxp.RS_GRPP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<GrupoProductoPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_GRPP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<GrupoProductoPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_GRPP}${wsEndpoint}`;
    return this.http.delete<GrupoProductoPago>(url, this.httpOptions).pipe(
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
