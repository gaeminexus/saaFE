import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ServiciosRhh } from './ws-rrh';
import { Historial } from '../model/historial';
import { Observable, catchError, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HistorialService {

      httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Historial[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_HSTR}${wsGetById}`;
    return this.http.get<Historial[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Historial | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_HSTR}${wsGetById}${id}`;
    return this.http.get<Historial>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Historial | null> {
    return this.http.post<Historial>(ServiciosRhh.RS_HSTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Historial | null> {
    return this.http.put<Historial>(ServiciosRhh.RS_HSTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Historial[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_HSTR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Historial | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_HSTR}${wsEndpoint}`;
    return this.http.delete<Historial>(url, this.httpOptions).pipe(
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

