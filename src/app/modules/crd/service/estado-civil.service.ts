import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { EstadoCivil } from '../model/estado-civil';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class EstadoCivilService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<EstadoCivil[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_ESCV}${wsGetById}`;
    return this.http.get<EstadoCivil[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<EstadoCivil | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_ESCV}${wsGetById}${id}`;
    return this.http.get<EstadoCivil>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new registro to the server */
  add(datos: any): Observable<EstadoCivil | null> {
    return this.http.post<EstadoCivil>(ServiciosCrd.RS_ESCV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing registro */
  update(datos: any): Observable<EstadoCivil | null> {
    return this.http.put<EstadoCivil>(ServiciosCrd.RS_ESCV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<EstadoCivil[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_ESCV}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: remove registro by id */
  delete(datos: any): Observable<EstadoCivil | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_ESCV}${wsGetById}`;
    return this.http.delete<EstadoCivil>(url, this.httpOptions).pipe(
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
