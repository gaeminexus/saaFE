import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { RolPago } from '../model/RolPago';

@Injectable({
  providedIn: 'root',
})
export class RolPagoService {

    httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<RolPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_RSMN}${wsGetById}`;
    return this.http.get<RolPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<RolPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_RSMN}${wsGetById}${id}`;
    return this.http.get<RolPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<RolPago | null> {
    return this.http.post<RolPago>(ServiciosRhh.RS_RSMN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<RolPago | null> {
    return this.http.put<RolPago>(ServiciosRhh.RS_RSMN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<RolPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_RSMN}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<RolPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_RSMN}${wsEndpoint}`;
    return this.http.delete<RolPago>(url, this.httpOptions).pipe(
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
