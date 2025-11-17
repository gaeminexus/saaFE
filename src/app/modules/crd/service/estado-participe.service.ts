import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { EstadoParticipe } from '../model/estado-participe';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class EstadoParticipeService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<EstadoParticipe[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_ESPR}${wsGetById}`;
    return this.http.get<EstadoParticipe[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<EstadoParticipe | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_ESPR}${wsGetById}${id}`;
    return this.http.get<EstadoParticipe>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new registro to the server */
  add(datos: any): Observable<EstadoParticipe | null> {
    return this.http.post<EstadoParticipe>(ServiciosCrd.RS_ESPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing registro */
  update(datos: any): Observable<EstadoParticipe | null> {
    return this.http.put<EstadoParticipe>(ServiciosCrd.RS_ESPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<EstadoParticipe[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_ESPR}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: remove registro by id */
  delete(datos: any): Observable<EstadoParticipe | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_ESPR}${wsGetById}`;
    return this.http.delete<EstadoParticipe>(url, this.httpOptions).pipe(
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
