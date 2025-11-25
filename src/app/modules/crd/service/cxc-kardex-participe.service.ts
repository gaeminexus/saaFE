import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CxcKardexParticipe } from '../model/Cxc-kardex-participe';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class CxcKardexParticipeService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<CxcKardexParticipe[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_CXCK}${wsGetById}`;
    return this.http.get<CxcKardexParticipe[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<CxcKardexParticipe | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_CXCK}${wsGetById}${id}`;
    return this.http.get<CxcKardexParticipe>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<CxcKardexParticipe | null> {
    return this.http.post<CxcKardexParticipe>(ServiciosCrd.RS_CXCK, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<CxcKardexParticipe | null> {
    return this.http.put<CxcKardexParticipe>(ServiciosCrd.RS_CXCK, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<CxcKardexParticipe[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CXCK}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<CxcKardexParticipe | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_CXCK}${wsEndpoint}`;
    return this.http.delete<CxcKardexParticipe>(url, this.httpOptions).pipe(
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
