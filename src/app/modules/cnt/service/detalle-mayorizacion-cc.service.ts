import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleMayorizacionCC } from '../model/detalle-mayorizacion-cc';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class DetalleMayorizacionCcService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetalleMayorizacionCC[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_MYCC}${wsGetById}`;
    return this.http.get<DetalleMayorizacionCC[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetalleMayorizacionCC | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_MYCC}${wsGetById}${id}`;
    return this.http.get<DetalleMayorizacionCC>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<DetalleMayorizacionCC | null> {
    return this.http.post<DetalleMayorizacionCC>(ServiciosCnt.RS_MYCC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<DetalleMayorizacionCC | null> {
    return this.http.put<DetalleMayorizacionCC>(ServiciosCnt.RS_MYCC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleMayorizacionCC[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_MYCC}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<DetalleMayorizacionCC | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_MYCC}${wsGetById}`;
    return this.http.delete<DetalleMayorizacionCC>(url, this.httpOptions).pipe(
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
