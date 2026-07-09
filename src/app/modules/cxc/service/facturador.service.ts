import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Facturador } from '../model/facturador';
import { ServiciosCxc } from './ws-cxc';

@Injectable({
  providedIn: 'root',
})
export class FacturadorService {
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Facturador[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_FCDR}${wsGetById}`;
    return this.http.get<Facturador[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<Facturador | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_FCDR}${wsGetById}${id}`;
    return this.http.get<Facturador>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<Facturador | null> {
    return this.http.post<Facturador>(ServiciosCxc.RS_FCDR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<Facturador | null> {
    return this.http.put<Facturador>(ServiciosCxc.RS_FCDR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Facturador[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_FCDR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<Facturador | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_FCDR}${wsEndpoint}`;
    return this.http.delete<Facturador>(url, this.httpOptions).pipe(
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
