import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoRequisitoPrestamo } from '../model/tipo-requisito-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class TipoRequisitoPrestamoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TipoRequisitoPrestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_TPRQ}${wsGetById}`;
    return this.http.get<TipoRequisitoPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoRequisitoPrestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TPRQ}${wsGetById}${id}`;
    return this.http.get<TipoRequisitoPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new record */
  add(datos: any): Observable<TipoRequisitoPrestamo | null> {
    return this.http.post<TipoRequisitoPrestamo>(ServiciosCrd.RS_TPRQ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TipoRequisitoPrestamo | null> {
    return this.http.put<TipoRequisitoPrestamo>(ServiciosCrd.RS_TPRQ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoRequisitoPrestamo[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TPRQ}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete record by ID */
  delete(id: any): Observable<TipoRequisitoPrestamo | null> {
    const wsGetById = '/' + id;
    const url = `${ServiciosCrd.RS_TPRQ}${wsGetById}`;
    return this.http.delete<TipoRequisitoPrestamo>(url, this.httpOptions).pipe(
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
