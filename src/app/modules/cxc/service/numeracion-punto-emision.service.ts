import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { NumeracionPuntoEmision } from '../model/numeracion-punto-emision';
import { ServiciosCxc } from './ws-cxc';

@Injectable({
  providedIn: 'root',
})
export class NumeracionPuntoEmisionService {
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NumeracionPuntoEmision[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_NXPE}${wsGetById}`;
    return this.http.get<NumeracionPuntoEmision[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<NumeracionPuntoEmision | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_NXPE}${wsGetById}${id}`;
    return this.http.get<NumeracionPuntoEmision>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<NumeracionPuntoEmision | null> {
    return this.http.post<NumeracionPuntoEmision>(ServiciosCxc.RS_NXPE, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<NumeracionPuntoEmision | null> {
    return this.http.put<NumeracionPuntoEmision>(ServiciosCxc.RS_NXPE, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<NumeracionPuntoEmision[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_NXPE}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<NumeracionPuntoEmision | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_NXPE}${wsEndpoint}`;
    return this.http.delete<NumeracionPuntoEmision>(url, this.httpOptions).pipe(
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
