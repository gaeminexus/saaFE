import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Aporte } from '../model/aporte';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class AporteService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Aporte[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}`;
    return this.http.get<Aporte[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Aporte | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}${id}`;
    return this.http.get<Aporte>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new record */
  add(datos: any): Observable<Aporte | null> {
    return this.http.post<Aporte>(ServiciosCrd.RS_APRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Aporte | null> {
    return this.http.put<Aporte>(ServiciosCrd.RS_APRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Aporte[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete record by ID */
  delete(id: any): Observable<Aporte | null> {
    const wsGetById = '/' + id;
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}`;
    return this.http.delete<Aporte>(url, this.httpOptions).pipe(
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
