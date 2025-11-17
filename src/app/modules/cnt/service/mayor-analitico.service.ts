import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MayorAnalitico } from '../model/mayor-analitico';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class MayorAnaliticoServicio {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<MayorAnalitico[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_MYAN}${wsGetById}`;
    return this.http.get<MayorAnalitico[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<MayorAnalitico | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_MYAN}${wsGetById}${id}`;
    return this.http.get<MayorAnalitico>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<MayorAnalitico | null> {
    return this.http.post<MayorAnalitico>(ServiciosCnt.RS_MYAN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<MayorAnalitico | null> {
    return this.http.put<MayorAnalitico>(ServiciosCnt.RS_MYAN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<MayorAnalitico[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_MYAN}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<MayorAnalitico | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_MYAN}${wsGetById}`;
    return this.http.delete<MayorAnalitico>(url, this.httpOptions).pipe(
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
