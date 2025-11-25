import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Ciudad } from '../model/ciudad';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class CiudadService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Ciudad[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_CDDD}${wsGetById}`;
    return this.http.get<Ciudad[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Ciudad | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_CDDD}${wsGetById}${id}`;
    return this.http.get<Ciudad>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Ciudad | null> {
    return this.http.post<Ciudad>(ServiciosCrd.RS_CDDD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Ciudad | null> {
    return this.http.put<Ciudad>(ServiciosCrd.RS_CDDD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Ciudad[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CDDD}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Ciudad | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_CDDD}${wsEndpoint}`;
    return this.http.delete<Ciudad>(url, this.httpOptions).pipe(
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
