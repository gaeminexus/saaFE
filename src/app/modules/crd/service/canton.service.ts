import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Canton } from '../model/canton';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class CantonService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Canton[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_CNTN}${wsGetById}`;
    return this.http.get<Canton[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Canton | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_CNTN}${wsGetById}${id}`;
    return this.http.get<Canton>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<Canton | null> {
    return this.http.post<Canton>(ServiciosCrd.RS_CNTN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update a sesion to the server */
  update(datos: any): Observable<Canton | null> {
    return this.http.put<Canton>(ServiciosCrd.RS_CNTN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Canton[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CNTN}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete by id */
  delete(datos: any): Observable<Canton | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_CNTN}${wsGetById}`;
    return this.http.delete<Canton>(url, this.httpOptions).pipe(
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
