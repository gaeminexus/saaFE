import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { ContratoEmpleado } from '../model/contrato-empleado';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class ContratoEmpleadoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ContratoEmpleado[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_CNTE}${wsGetById}`;
    return this.http.get<ContratoEmpleado[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<ContratoEmpleado | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_CNTE}${wsGetById}${id}`;
    return this.http.get<ContratoEmpleado>(url).pipe(catchError(this.handleError));
  }

  /** POST: add new record */
  add(datos: any): Observable<ContratoEmpleado | null> {
    const base = ServiciosRhh.RS_CNTE;
    return this.http.post<ContratoEmpleado>(base, datos, this.httpOptions).pipe(
      catchError(() => this.http.post<ContratoEmpleado>(`${base}/add`, datos, this.httpOptions)),
      catchError(() => this.http.post<ContratoEmpleado>(`${base}/save`, datos, this.httpOptions)),
      catchError(this.handleError),
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ContratoEmpleado | null> {
    const base = ServiciosRhh.RS_CNTE;
    return this.http.put<ContratoEmpleado>(base, datos, this.httpOptions).pipe(
      catchError(() => this.http.post<ContratoEmpleado>(base, datos, this.httpOptions)),
      catchError(() => this.http.post<ContratoEmpleado>(`${base}/update`, datos, this.httpOptions)),
      catchError(this.handleError),
    );
  }

  selectByCriteria(datos: any): Observable<ContratoEmpleado[] | null> {
    const wsEndpoint = '/selectByCriteria';
    const url = `${ServiciosRhh.RS_CNTE}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** DELETE */
  delete(id: any): Observable<ContratoEmpleado | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_CNTE}${wsEndpoint}`;
    return this.http
      .delete<ContratoEmpleado>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
