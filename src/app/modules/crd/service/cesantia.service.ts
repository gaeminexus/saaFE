import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Cesantia } from '../model/cesantia';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class CesantiaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Cesantia[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_CSNT}${wsGetById}`;
    return this.http.get<Cesantia[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Cesantia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_CSNT}${wsGetById}${id}`;
    return this.http.get<Cesantia>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Cesantia | null> {
    return this.http.post<Cesantia>(ServiciosCrd.RS_CSNT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Cesantia | null> {
    return this.http.put<Cesantia>(ServiciosCrd.RS_CSNT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Cesantia[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CSNT}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Cesantia | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_CSNT}${wsEndpoint}`;
    return this.http.delete<Cesantia>(url, this.httpOptions).pipe(
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
