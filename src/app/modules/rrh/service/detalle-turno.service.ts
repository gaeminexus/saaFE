import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { DetalleTurno } from '../model/detalle-turno';

@Injectable({
  providedIn: 'root',
})
export class DetalleTurnoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetalleTurno[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_DTLL}${wsGetById}`;
    return this.http.get<DetalleTurno[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetalleTurno | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_DTLL}${wsGetById}${id}`;
    return this.http.get<DetalleTurno>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<DetalleTurno | null> {
    return this.http.post<DetalleTurno>(ServiciosRhh.RS_DTLL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<DetalleTurno | null> {
    return this.http.put<DetalleTurno>(ServiciosRhh.RS_DTLL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleTurno[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_DTLL}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<DetalleTurno | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_DTLL}${wsEndpoint}`;
    return this.http.delete<DetalleTurno>(url, this.httpOptions).pipe(
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
