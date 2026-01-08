import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { GrupoProductoCobro } from '../model/grupo-producto-cobro';



@Injectable({
  providedIn: 'root'
})
export class GrupoProductoCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<GrupoProductoCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_GRPC}${wsGetById}`;
    return this.http.get<GrupoProductoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<GrupoProductoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_GRPC}${wsGetById}${id}`;
    return this.http.get<GrupoProductoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<GrupoProductoCobro | null> {
    return this.http.post<GrupoProductoCobro>(ServiciosCxc.RS_GRPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<GrupoProductoCobro | null> {
    return this.http.put<GrupoProductoCobro>(ServiciosCxc.RS_GRPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<GrupoProductoCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_GRPC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<GrupoProductoCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_GRPC}${wsEndpoint}`;
    return this.http.delete<GrupoProductoCobro>(url, this.httpOptions).pipe(
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
