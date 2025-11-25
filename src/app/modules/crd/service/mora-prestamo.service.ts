import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MoraPrestamo } from '../model/mora-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class MoraPrestamoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<MoraPrestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_MRPR}${wsGetById}`;
    return this.http.get<MoraPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<MoraPrestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_MRPR}${wsGetById}${id}`;
    return this.http.get<MoraPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<MoraPrestamo | null> {
    return this.http.post<MoraPrestamo>(ServiciosCrd.RS_MRPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<MoraPrestamo | null> {
    return this.http.put<MoraPrestamo>(ServiciosCrd.RS_MRPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<MoraPrestamo[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_MRPR}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<MoraPrestamo | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_MRPR}${wsEndpoint}`;
    return this.http.delete<MoraPrestamo>(url, this.httpOptions).pipe(
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
