import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ServiciosRhh } from './ws-rrh';
import { catchError, Observable, of, throwError } from 'rxjs';
import { Cargo } from '../model/cargo';

@Injectable({
  providedIn: 'root',
})
export class CargoService {

    httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Cargo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_CRGO}${wsGetById}`;
    return this.http.get<Cargo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Cargo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_CRGO}${wsGetById}${id}`;
    return this.http.get<Cargo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Cargo | null> {
    return this.http.post<Cargo>(ServiciosRhh.RS_CRGO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Cargo | null> {
    return this.http.put<Cargo>(ServiciosRhh.RS_CRGO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Cargo[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_CRGO}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Cargo | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_CRGO}${wsEndpoint}`;
    return this.http.delete<Cargo>(url, this.httpOptions).pipe(
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
