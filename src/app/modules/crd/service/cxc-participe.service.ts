import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CxcParticipe } from '../model/cxc-participe';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class CxcParticipeService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<CxcParticipe[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_CXCP}${wsGetById}`;
    return this.http.get<CxcParticipe[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<CxcParticipe | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_CXCP}${wsGetById}${id}`;
    return this.http.get<CxcParticipe>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<CxcParticipe | null> {
    return this.http.post<CxcParticipe>(ServiciosCrd.RS_CXCP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<CxcParticipe | null> {
    return this.http.put<CxcParticipe>(ServiciosCrd.RS_CXCP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<CxcParticipe[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CXCP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<CxcParticipe | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_CXCP}${wsEndpoint}`;
    return this.http.delete<CxcParticipe>(url, this.httpOptions).pipe(
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
