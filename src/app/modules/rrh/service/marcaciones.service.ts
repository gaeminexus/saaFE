import { Injectable } from '@angular/core';
import { Marcaciones } from '../model/marcaciones';
import { catchError, Observable, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class MarcacionesService {

    httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Marcaciones[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_MRCC}${wsGetById}`;
    return this.http.get<Marcaciones[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Marcaciones | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_MRCC}${wsGetById}${id}`;
    return this.http.get<Marcaciones>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Marcaciones | null> {
    return this.http.post<Marcaciones>(ServiciosRhh.RS_MRCC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Marcaciones | null> {
    return this.http.put<Marcaciones>(ServiciosRhh.RS_MRCC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Marcaciones[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_MRCC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Marcaciones | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_MRCC}${wsEndpoint}`;
    return this.http.delete<Marcaciones>(url, this.httpOptions).pipe(
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


