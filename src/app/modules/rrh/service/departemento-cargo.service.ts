import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { departamentocargo } from '../model/departamento-cargo';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class DepartementoCargoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<departamentocargo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_DPRT}${wsGetById}`;
    return this.http.get<departamentocargo[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<departamentocargo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_DPRT}${wsGetById}${id}`;
    return this.http.get<departamentocargo>(url).pipe(catchError(this.handleError));
  }

  /** POST: add new record */
  add(datos: any): Observable<departamentocargo | null> {
    return this.http
      .post<departamentocargo>(ServiciosRhh.RS_DPRT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** PUT: update record */
  update(datos: any): Observable<departamentocargo | null> {
    return this.http
      .put<departamentocargo>(ServiciosRhh.RS_DPRT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<departamentocargo[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_DPRT}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** DELETE */
  delete(id: any): Observable<departamentocargo | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_DPRT}${wsEndpoint}`;
    return this.http
      .delete<departamentocargo>(url, this.httpOptions)
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
