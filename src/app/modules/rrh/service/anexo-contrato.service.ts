import { Injectable } from '@angular/core';
import { AnexoContrato } from '../model/anexo-contrato';
import { catchError, Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class AnexoContratoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<AnexoContrato[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_NXOO}${wsGetById}`;
    return this.http.get<AnexoContrato[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<AnexoContrato | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_NXOO}${wsGetById}${id}`;
    return this.http.get<AnexoContrato>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<AnexoContrato | null> {
    return this.http.post<AnexoContrato>(ServiciosRhh.RS_NXOO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<AnexoContrato | null> {
    return this.http.put<AnexoContrato>(ServiciosRhh.RS_NXOO, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<AnexoContrato[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_NXOO}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<AnexoContrato | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_NXOO}${wsEndpoint}`;
    return this.http.delete<AnexoContrato>(url, this.httpOptions).pipe(
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


