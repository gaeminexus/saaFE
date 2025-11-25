import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { RelacionPrestamo } from '../model/relacion-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class RelacionPrestamoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<RelacionPrestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_RLPR}${wsGetById}`;
    return this.http.get<RelacionPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<RelacionPrestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_RLPR}${wsGetById}${id}`;
    return this.http.get<RelacionPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<RelacionPrestamo | null> {
    return this.http.post<RelacionPrestamo>(ServiciosCrd.RS_RLPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<RelacionPrestamo | null> {
    return this.http.put<RelacionPrestamo>(ServiciosCrd.RS_RLPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<RelacionPrestamo[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_RLPR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<RelacionPrestamo | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_RLPR}${wsEndpoint}`;
    return this.http.delete<RelacionPrestamo>(url, this.httpOptions).pipe(
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
