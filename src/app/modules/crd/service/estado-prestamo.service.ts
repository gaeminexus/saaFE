import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { EstadoPrestamo } from '../model/estado-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class EstadoPrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<EstadoPrestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_ESPS}${wsGetById}`;
    return this.http.get<EstadoPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<EstadoPrestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_ESPS}${wsGetById}${id}`;
    return this.http.get<EstadoPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new registro to the server */
  add(datos: any): Observable<EstadoPrestamo | null> {
    return this.http.post<EstadoPrestamo>(ServiciosCrd.RS_ESPS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing registro */
  update(datos: any): Observable<EstadoPrestamo | null> {
    return this.http.put<EstadoPrestamo>(ServiciosCrd.RS_ESPS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<EstadoPrestamo[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_ESPS}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: remove registro by id */
  delete(datos: any): Observable<EstadoPrestamo | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_ESPS}${wsGetById}`;
    return this.http.delete<EstadoPrestamo>(url, this.httpOptions).pipe(
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
