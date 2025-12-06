import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Auditoria } from '../model/auditoria';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root',
})
export class AuditoriaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Auditoria[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosCrd.RS_ADTR}${wsGetAll}`;
    return this.http.get<Auditoria[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Auditoria | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_ADTR}${wsGetById}${id}`;
    return this.http.get<Auditoria>(url).pipe(catchError(this.handleError));
  }

  /** POST: add new Auditoria record */
  add(datos: any): Observable<Auditoria | null> {
    return this.http
      .post<Auditoria>(ServiciosCrd.RS_ADTR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** PUT: update Auditoria record */
  update(datos: any): Observable<Auditoria | null> {
    return this.http
      .put<Auditoria>(ServiciosCrd.RS_ADTR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<Auditoria[] | null> {
    const wsSelect = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_ADTR}${wsSelect}`;
    return this.http
      .post<Auditoria[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** DELETE: delete Auditoria record */
  delete(id: any): Observable<Auditoria | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosCrd.RS_ADTR}${wsDelete}`;
    return this.http.delete<Auditoria>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
