import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PersonaNatural } from '../model/persona-natural';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class PersonaNaturalService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<PersonaNatural[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRSN}${wsGetById}`;
    return this.http.get<PersonaNatural[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<PersonaNatural | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRSN}${wsGetById}${id}`;
    return this.http.get<PersonaNatural>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<PersonaNatural | null> {
    return this.http.post<PersonaNatural>(ServiciosCrd.RS_PRSN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<PersonaNatural | null> {
    return this.http.put<PersonaNatural>(ServiciosCrd.RS_PRSN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<PersonaNatural[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PRSN}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<PersonaNatural | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_PRSN}${wsEndpoint}`;
    return this.http.delete<PersonaNatural>(url, this.httpOptions).pipe(
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
