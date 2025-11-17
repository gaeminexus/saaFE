import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DesgloseMayorizacionCC } from '../model/desglose-mayorizacion-cc';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class DesgloseMayorizacionCcService {

httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DesgloseMayorizacionCC[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_DTMC}${wsGetById}`;
    return this.http.get<DesgloseMayorizacionCC[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DesgloseMayorizacionCC| null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_DTMC}${wsGetById}${id}`;
    return this.http.get<DesgloseMayorizacionCC>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<DesgloseMayorizacionCC| null> {
    return this.http.post<DesgloseMayorizacionCC>(ServiciosCnt.RS_DTMC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<DesgloseMayorizacionCC| null> {
    return this.http.put<DesgloseMayorizacionCC>(ServiciosCnt.RS_DTMC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DesgloseMayorizacionCC[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_DTMC}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<DesgloseMayorizacionCC| null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_DTMC}${wsGetById}`;
    return this.http.delete<DesgloseMayorizacionCC>(url, this.httpOptions).pipe(
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
