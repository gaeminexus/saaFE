import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HistorialSueldo } from '../model/historial-sueldo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class HistorialSueldoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<HistorialSueldo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_HSTR}${wsGetById}`;
    return this.http.get<HistorialSueldo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<HistorialSueldo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_HSTR}${wsGetById}${id}`;
    return this.http.get<HistorialSueldo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<HistorialSueldo | null> {
    return this.http.post<HistorialSueldo>(ServiciosCrd.RS_HSTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<HistorialSueldo | null> {
    return this.http.put<HistorialSueldo>(ServiciosCrd.RS_HSTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<HistorialSueldo[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_HSTR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<HistorialSueldo | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_HSTR}${wsEndpoint}`;
    return this.http.delete<HistorialSueldo>(url, this.httpOptions).pipe(
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
