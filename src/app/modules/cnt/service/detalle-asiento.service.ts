import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleAsiento } from '../model/detalle-asiento';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class DetalleAsientoService {

   httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetalleAsiento[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_DTAS}${wsGetById}`;
    return this.http.get<DetalleAsiento[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetalleAsiento| null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_DTAS}${wsGetById}${id}`;
    return this.http.get<DetalleAsiento>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<DetalleAsiento| null> {
    return this.http.post<DetalleAsiento>(ServiciosCnt.RS_DTAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<DetalleAsiento| null> {
    return this.http.put<DetalleAsiento>(ServiciosCnt.RS_DTAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleAsiento[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_DTAS}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<DetalleAsiento| null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_DTAS}${wsGetById}`;
    return this.http.delete<DetalleAsiento>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}



