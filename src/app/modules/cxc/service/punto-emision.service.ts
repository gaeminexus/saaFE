import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PuntoEmision } from '../model/puntos-emision';
import { ServiciosCxc } from './ws-cxc';

@Injectable({
  providedIn: 'root',
})
export class PuntoEmisionService {
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<PuntoEmision[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_PTEM}${wsGetById}`;
    return this.http.get<PuntoEmision[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<PuntoEmision | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_PTEM}${wsGetById}${id}`;
    return this.http.get<PuntoEmision>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<PuntoEmision | null> {
    return this.http.post<PuntoEmision>(ServiciosCxc.RS_PTEM, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<PuntoEmision | null> {
    return this.http.put<PuntoEmision>(ServiciosCxc.RS_PTEM, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<PuntoEmision[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_PTEM}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<PuntoEmision | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_PTEM}${wsEndpoint}`;
    return this.http.delete<PuntoEmision>(url, this.httpOptions).pipe(
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
