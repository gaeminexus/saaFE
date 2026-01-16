import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';
import { AporteAsoprep } from '../model/aporte-asoprep';

@Injectable({
  providedIn: 'root',
})
export class AporteAsoprepService {

    httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<AporteAsoprep[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_APAS}${wsGetById}`;
    return this.http.get<AporteAsoprep[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<AporteAsoprep | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_APAS}${wsGetById}${id}`;
    return this.http.get<AporteAsoprep>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<AporteAsoprep | null> {
    return this.http.post<AporteAsoprep>(ServiciosCrd.RS_APAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<AporteAsoprep | null> {
    return this.http.put<AporteAsoprep>(ServiciosCrd.RS_APAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<AporteAsoprep[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_APAS}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<AporteAsoprep | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_APAS}${wsEndpoint}`;
    return this.http.delete<AporteAsoprep>(url, this.httpOptions).pipe(
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
