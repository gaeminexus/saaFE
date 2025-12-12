import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Entidad } from '../model/entidad';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class EntidadService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Entidad[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_ENTD}${wsGetById}`;
    return this.http.get<Entidad[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Entidad | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_ENTD}${wsGetById}${id}`;
    return this.http.get<Entidad>(url).pipe(
      catchError(this.handleError)
    );
  }

  getCoincidencias(nombre: string): Observable<Entidad[] | null> {
    const wsGetById = '/getCoincidencias/';
    const url = `${ServiciosCrd.RS_ENTD}${wsGetById}${nombre}`;
    return this.http.get<Entidad[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getByNombrePetro35(nombre: string): Observable<Entidad[] | null> {
    const wsGetById = '/getByNombrePetro35/';
    const url = `${ServiciosCrd.RS_ENTD}${wsGetById}${nombre}`;
    return this.http.get<Entidad[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Entidad | null> {
    return this.http.post<Entidad>(ServiciosCrd.RS_ENTD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Entidad | null> {
    return this.http.put<Entidad>(ServiciosCrd.RS_ENTD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Entidad[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_ENTD}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Entidad | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_ENTD}${wsEndpoint}`;
    return this.http.delete<Entidad>(url, this.httpOptions).pipe(
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
