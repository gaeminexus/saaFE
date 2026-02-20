import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CentroCosto } from '../model/centro-costo';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class CentroCostoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<CentroCosto[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_CNCS}${wsGetById}`;
    return this.http.get<CentroCosto[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<CentroCosto | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_CNCS}${wsGetById}${id}`;
    return this.http.get<CentroCosto>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<CentroCosto | null> {
    return this.http.post<CentroCosto>(ServiciosCnt.RS_CNCS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<CentroCosto | null> {
    return this.http.put<CentroCosto>(ServiciosCnt.RS_CNCS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<CentroCosto[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_CNCS}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<CentroCosto | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_CNCS}${wsGetById}`;
    return this.http.delete<CentroCosto>(url, this.httpOptions).pipe(
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
