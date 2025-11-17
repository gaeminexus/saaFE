import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { EstadoCesantia } from '../model/estado-cesantia';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class EstadoCesantiaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<EstadoCesantia[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_ESCS}${wsGetById}`;
    return this.http.get<EstadoCesantia[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<EstadoCesantia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_ESCS}${wsGetById}${id}`;
    return this.http.get<EstadoCesantia>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new registro to the server */
  add(datos: any): Observable<EstadoCesantia | null> {
    return this.http.post<EstadoCesantia>(ServiciosCrd.RS_ESCS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing registro */
  update(datos: any): Observable<EstadoCesantia | null> {
    return this.http.put<EstadoCesantia>(ServiciosCrd.RS_ESCS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<EstadoCesantia[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_ESCS}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: remove registro by id */
  delete(datos: any): Observable<EstadoCesantia | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_ESCS}${wsGetById}`;
    return this.http.delete<EstadoCesantia>(url, this.httpOptions).pipe(
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
