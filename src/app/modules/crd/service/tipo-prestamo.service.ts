import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoPrestamo } from '../model/tipo-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class TipoPrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TipoPrestamo[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosCrd.RS_TPPR}${wsGetAll}`;
    return this.http.get<TipoPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoPrestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TPPR}${wsGetById}${id}`;
    return this.http.get<TipoPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new TipoPrestamo to the server */
  add(datos: any): Observable<TipoPrestamo | null> {
    return this.http.post<TipoPrestamo>(ServiciosCrd.RS_TPPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing TipoPrestamo */
  update(datos: any): Observable<TipoPrestamo | null> {
    return this.http.put<TipoPrestamo>(ServiciosCrd.RS_TPPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoPrestamo[] | null> {
    const wsSelect = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TPPR}${wsSelect}`;
    return this.http.post<TipoPrestamo[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete a TipoPrestamo */
  delete(id: any): Observable<TipoPrestamo | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosCrd.RS_TPPR}${wsDelete}`;
    return this.http.delete<TipoPrestamo>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
