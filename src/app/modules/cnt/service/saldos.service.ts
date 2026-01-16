import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Saldos } from '../model/saldos';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root',
})
export class SaldosService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Saldos[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_SLDS}${wsGetById}`;
    return this.http.get<Saldos[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Saldos | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_SLDS}${wsGetById}${id}`;
    return this.http.get<Saldos>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<Saldos | null> {
    return this.http.post<Saldos>(ServiciosCnt.RS_SLDS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<Saldos | null> {
    return this.http.put<Saldos>(ServiciosCnt.RS_SLDS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Saldos[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_SLDS}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<Saldos | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_SLDS}${wsGetById}`;
    return this.http.delete<Saldos>(url, this.httpOptions).pipe(
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
