import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DireccionTrabajo } from '../model/direccion-trabajo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class DireccionTrabajoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DireccionTrabajo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_DRTR}${wsGetById}`;
    return this.http.get<DireccionTrabajo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DireccionTrabajo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_DRTR}${wsGetById}${id}`;
    return this.http.get<DireccionTrabajo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<DireccionTrabajo | null> {
    return this.http.post<DireccionTrabajo>(ServiciosCrd.RS_DRTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<DireccionTrabajo | null> {
    return this.http.put<DireccionTrabajo>(ServiciosCrd.RS_DRTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DireccionTrabajo[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_DRTR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<DireccionTrabajo | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_DRTR}${wsEndpoint}`;
    return this.http.delete<DireccionTrabajo>(url, this.httpOptions).pipe(
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
