import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Provincia } from '../model/provincia';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class ProvinciaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Provincia[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRVN}${wsGetById}`;
    return this.http.get<Provincia[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Provincia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRVN}${wsGetById}${id}`;
    return this.http.get<Provincia>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Provincia | null> {
    return this.http.post<Provincia>(ServiciosCrd.RS_PRVN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Provincia | null> {
    return this.http.put<Provincia>(ServiciosCrd.RS_PRVN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Provincia[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PRVN}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Provincia | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_PRVN}${wsEndpoint}`;
    return this.http.delete<Provincia>(url, this.httpOptions).pipe(
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
