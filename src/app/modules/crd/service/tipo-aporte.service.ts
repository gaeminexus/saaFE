import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoAporte } from '../model/tipo-aporte';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class TipoAporteService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TipoAporte[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_TPAP}${wsGetById}`;
    return this.http.get<TipoAporte[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoAporte | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TPAP}${wsGetById}${id}`;
    return this.http.get<TipoAporte>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TipoAporte | null> {
    return this.http.post<TipoAporte>(ServiciosCrd.RS_TPAP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TipoAporte | null> {
    return this.http.put<TipoAporte>(ServiciosCrd.RS_TPAP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoAporte[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TPAP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TipoAporte | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_TPAP}${wsEndpoint}`;
    return this.http.delete<TipoAporte>(url, this.httpOptions).pipe(
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
