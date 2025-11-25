import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Parroquia } from '../model/parroquia';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class ParroquiaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Parroquia[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRRQ}${wsGetById}`;
    return this.http.get<Parroquia[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Parroquia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRRQ}${wsGetById}${id}`;
    return this.http.get<Parroquia>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Parroquia | null> {
    return this.http.post<Parroquia>(ServiciosCrd.RS_PRRQ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Parroquia | null> {
    return this.http.put<Parroquia>(ServiciosCrd.RS_PRRQ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Parroquia[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PRRQ}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Parroquia | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_PRRQ}${wsEndpoint}`;
    return this.http.delete<Parroquia>(url, this.httpOptions).pipe(
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
