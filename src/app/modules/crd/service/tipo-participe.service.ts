import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoParticipe } from '../model/tipo-participe';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class TipoParticipeService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TipoParticipe[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_TPPC}${wsGetById}`;
    return this.http.get<TipoParticipe[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoParticipe | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TPPC}${wsGetById}${id}`;
    return this.http.get<TipoParticipe>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TipoParticipe | null> {
    return this.http.post<TipoParticipe>(ServiciosCrd.RS_TPPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TipoParticipe | null> {
    return this.http.put<TipoParticipe>(ServiciosCrd.RS_TPPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoParticipe[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TPPC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete record */
  delete(id: any): Observable<TipoParticipe | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_TPPC}${wsEndpoint}`;
    return this.http.delete<TipoParticipe>(url, this.httpOptions).pipe(
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
