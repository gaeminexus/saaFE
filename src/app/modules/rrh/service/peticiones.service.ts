import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { Peticiones } from '../model/peticiones';

@Injectable({
  providedIn: 'root',
})
export class PeticionesService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Peticiones[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_PTCN}${wsGetById}`;
    return this.http.get<Peticiones[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Peticiones | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_PTCN}${wsGetById}${id}`;
    return this.http.get<Peticiones>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Peticiones | null> {
    return this.http.post<Peticiones>(ServiciosRhh.RS_PTCN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Peticiones | null> {
    return this.http.put<Peticiones>(ServiciosRhh.RS_PTCN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Peticiones[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_PTCN}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Peticiones | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_PTCN}${wsEndpoint}`;
    return this.http.delete<Peticiones>(url, this.httpOptions).pipe(
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
