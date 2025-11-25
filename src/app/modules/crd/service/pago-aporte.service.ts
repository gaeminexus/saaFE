import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PagoAporte } from '../model/pago-aporte';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class PagoAporteService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<PagoAporte[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PGAP}${wsGetById}`;
    return this.http.get<PagoAporte[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<PagoAporte | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PGAP}${wsGetById}${id}`;
    return this.http.get<PagoAporte>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<PagoAporte | null> {
    return this.http.post<PagoAporte>(ServiciosCrd.RS_PGAP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<PagoAporte | null> {
    return this.http.put<PagoAporte>(ServiciosCrd.RS_PGAP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<PagoAporte[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PGAP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<PagoAporte | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_PGAP}${wsEndpoint}`;
    return this.http.delete<PagoAporte>(url, this.httpOptions).pipe(
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
