import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { Empleado } from '../model/empleado';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class EmpleadoService {

    httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Empleado[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_MPLD}${wsGetById}`;
    return this.http.get<Empleado[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Empleado | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_MPLD}${wsGetById}${id}`;
    return this.http.get<Empleado>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Empleado | null> {
    return this.http.post<Empleado>(ServiciosRhh.RS_MPLD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Empleado | null> {
    return this.http.put<Empleado>(ServiciosRhh.RS_MPLD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Empleado[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_MPLD}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Empleado | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_MPLD}${wsEndpoint}`;
    return this.http.delete<Empleado>(url, this.httpOptions).pipe(
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
