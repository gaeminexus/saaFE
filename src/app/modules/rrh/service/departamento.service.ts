import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Departamento } from '../model/departamento';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class DepartamentoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Departamento[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_DPRT}${wsGetById}`;
    return this.http.get<Departamento[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Departamento | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_DPRT}${wsGetById}${id}`;
    return this.http.get<Departamento>(url).pipe(catchError(this.handleError));
  }

  /** POST: add new record */
  add(datos: any): Observable<Departamento | null> {
    return this.http
      .post<Departamento>(ServiciosRhh.RS_DPRT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** PUT: update record */
  update(datos: any): Observable<Departamento | null> {
    return this.http
      .put<Departamento>(ServiciosRhh.RS_DPRT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<Departamento[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_DPRT}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** DELETE */
  delete(id: any): Observable<Departamento | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_DPRT}${wsEndpoint}`;
    return this.http
      .delete<Departamento>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
