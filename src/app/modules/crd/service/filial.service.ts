import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Filial } from '../model/filial';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class FilialService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Filial[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosCrd.RS_FLLL}${wsGetAll}`;
    return this.http.get<Filial[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Filial | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_FLLL}${wsGetById}${id}`;
    return this.http.get<Filial>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new Filial */
  add(datos: any): Observable<Filial | null> {
    return this.http.post<Filial>(ServiciosCrd.RS_FLLL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing Filial */
  update(datos: any): Observable<Filial | null> {
    return this.http.put<Filial>(ServiciosCrd.RS_FLLL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Filial[] | null> {
    const wsSelect = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_FLLL}${wsSelect}`;
    return this.http.post<Filial[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete a Filial */
  delete(id: any): Observable<Filial | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosCrd.RS_FLLL}${wsDelete}`;
    return this.http.delete<Filial>(url, this.httpOptions).pipe(
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
