import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { RequisitosPrestamo } from '../model/requisitos-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class RequisitosPrestamoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<RequisitosPrestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_RQPR}${wsGetById}`;
    return this.http.get<RequisitosPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<RequisitosPrestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_RQPR}${wsGetById}${id}`;
    return this.http.get<RequisitosPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<RequisitosPrestamo | null> {
    return this.http.post<RequisitosPrestamo>(ServiciosCrd.RS_RQPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<RequisitosPrestamo | null> {
    return this.http.put<RequisitosPrestamo>(ServiciosCrd.RS_RQPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<RequisitosPrestamo[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_RQPR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<RequisitosPrestamo | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_RQPR}${wsEndpoint}`;
    return this.http.delete<RequisitosPrestamo>(url, this.httpOptions).pipe(
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
