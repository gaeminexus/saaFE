import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleMayorizacion } from '../model/detalle-mayorizacion';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class DetalleMayorizacionService {


  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetalleMayorizacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_DTMY}${wsGetById}`;
    return this.http.get<DetalleMayorizacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetalleMayorizacion| null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_DTMY}${wsGetById}${id}`;
    return this.http.get<DetalleMayorizacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  getByParent(idParent: number): Observable<DetalleMayorizacion[] | null> {
    const wsGetById = '/getByParent/';
    const url = `${ServiciosCnt.RS_DTMY}${wsGetById}${idParent}`;
    return this.http.get<DetalleMayorizacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<DetalleMayorizacion| null> {
    return this.http.post<DetalleMayorizacion>(ServiciosCnt.RS_DTMY, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<DetalleMayorizacion| null> {
    return this.http.put<DetalleMayorizacion>(ServiciosCnt.RS_DTMY, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleMayorizacion[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_DTMY}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<DetalleMayorizacion| null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_DTMY}${wsGetById}`;
    return this.http.delete<DetalleMayorizacion>(url, this.httpOptions).pipe(
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
