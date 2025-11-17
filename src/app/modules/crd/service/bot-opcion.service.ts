import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { BotOpcion } from '../model/bot-opcion';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class BotOpcionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<BotOpcion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_BTPC}${wsGetById}`;
    return this.http.get<BotOpcion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<BotOpcion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_BTPC}${wsGetById}${id}`;
    return this.http.get<BotOpcion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<BotOpcion | null> {
    return this.http.post<BotOpcion>(ServiciosCrd.RS_BTPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<BotOpcion | null> {
    return this.http.put<BotOpcion>(ServiciosCrd.RS_BTPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<BotOpcion[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_BTPC}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<BotOpcion | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_BTPC}${wsGetById}`;
    return this.http.delete<BotOpcion>(url, this.httpOptions).pipe(
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
