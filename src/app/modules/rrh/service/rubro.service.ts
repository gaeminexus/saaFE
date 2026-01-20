import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { Rubro } from '../model/rubro';

@Injectable({
  providedIn: 'root',
})
export class RubroService {

  httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Rubro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_RBRO}${wsGetById}`;
    return this.http.get<Rubro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Rubro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_RBRO}${wsGetById}${id}`;
    return this.http.get<Rubro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Rubro | null> {
    return this.http.post<Rubro>(ServiciosRhh.RS_RBRO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Rubro | null> {
    return this.http.put<Rubro>(ServiciosRhh.RS_RBRO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Rubro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_RBRO}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Rubro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_RBRO}${wsEndpoint}`;
    return this.http.delete<Rubro>(url, this.httpOptions).pipe(
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

