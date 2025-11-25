import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TasaPrestamo } from '../model/tasa-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class TasaPrestamoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TasaPrestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_TSPR}${wsGetById}`;
    return this.http.get<TasaPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TasaPrestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TSPR}${wsGetById}${id}`;
    return this.http.get<TasaPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TasaPrestamo | null> {
    return this.http.post<TasaPrestamo>(ServiciosCrd.RS_TSPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TasaPrestamo | null> {
    return this.http.put<TasaPrestamo>(ServiciosCrd.RS_TSPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TasaPrestamo[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TSPR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TasaPrestamo | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_TSPR}${wsEndpoint}`;
    return this.http.delete<TasaPrestamo>(url, this.httpOptions).pipe(
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
