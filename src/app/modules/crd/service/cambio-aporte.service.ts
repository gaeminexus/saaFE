import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CambioAporte } from '../model/cambio-aporte';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class CambioAporteService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<CambioAporte[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_CMBP}${wsGetById}`;
    return this.http.get<CambioAporte[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<CambioAporte | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_CMBP}${wsGetById}${id}`;
    return this.http.get<CambioAporte>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<CambioAporte | null> {
    return this.http.post<CambioAporte>(ServiciosCrd.RS_CMBP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<CambioAporte | null> {
    return this.http.put<CambioAporte>(ServiciosCrd.RS_CMBP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<CambioAporte[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CMBP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<CambioAporte | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_CMBP}${wsEndpoint}`;
    return this.http.delete<CambioAporte>(url, this.httpOptions).pipe(
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
