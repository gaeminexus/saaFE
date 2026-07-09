import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Establecimiento } from '../model/establecimientos';
import { ServiciosCxc } from './ws-cxc';

@Injectable({
  providedIn: 'root',
})
export class EstablecimientoService {
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Establecimiento[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_ESTB}${wsGetById}`;
    return this.http.get<Establecimiento[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<Establecimiento | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_ESTB}${wsGetById}${id}`;
    return this.http.get<Establecimiento>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<Establecimiento | null> {
    return this.http.post<Establecimiento>(ServiciosCxc.RS_ESTB, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<Establecimiento | null> {
    return this.http.put<Establecimiento>(ServiciosCxc.RS_ESTB, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Establecimiento[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_ESTB}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<Establecimiento | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_ESTB}${wsEndpoint}`;
    return this.http.delete<Establecimiento>(url, this.httpOptions).pipe(
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
