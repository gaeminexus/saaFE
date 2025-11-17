import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CreditoMontoAprobacion } from '../model/credito-monto-aprobacion';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class CreditoMontoAprobacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<CreditoMontoAprobacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_CRDT}${wsGetById}`;
    return this.http.get<CreditoMontoAprobacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<CreditoMontoAprobacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_CRDT}${wsGetById}${id}`;
    return this.http.get<CreditoMontoAprobacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new registro to the server */
  add(datos: any): Observable<CreditoMontoAprobacion | null> {
    return this.http.post<CreditoMontoAprobacion>(ServiciosCrd.RS_CRDT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing registro */
  update(datos: any): Observable<CreditoMontoAprobacion | null> {
    return this.http.put<CreditoMontoAprobacion>(ServiciosCrd.RS_CRDT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<CreditoMontoAprobacion[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CRDT}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: remove registro by id */
  delete(datos: any): Observable<CreditoMontoAprobacion | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_CRDT}${wsGetById}`;
    return this.http.delete<CreditoMontoAprobacion>(url, this.httpOptions).pipe(
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
