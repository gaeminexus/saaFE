import { BaseInicialParticipes } from './../model/base-inicial-participes';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class BaseInicialParticipesService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<BaseInicialParticipes[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_BIPR}${wsGetById}`;
    return this.http.get<BaseInicialParticipes[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<BaseInicialParticipes | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_BIPR}${wsGetById}${id}`;
    return this.http.get<BaseInicialParticipes>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<BaseInicialParticipes | null> {
    return this.http.post<BaseInicialParticipes>(ServiciosCrd.RS_BIPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<BaseInicialParticipes | null> {
    return this.http.put<BaseInicialParticipes>(ServiciosCrd.RS_BIPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<BaseInicialParticipes[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_BIPR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<BaseInicialParticipes | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_BIPR}${wsEndpoint}`;
    return this.http.delete<BaseInicialParticipes>(url, this.httpOptions).pipe(
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
