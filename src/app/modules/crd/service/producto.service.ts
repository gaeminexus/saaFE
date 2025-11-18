import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Producto } from '../model/producto';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Producto[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRDC}${wsGetById}`;
    return this.http.get<Producto[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Producto | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRDC}${wsGetById}${id}`;
    return this.http.get<Producto>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Producto | null> {
    return this.http.post<Producto>(ServiciosCrd.RS_PRDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Producto | null> {
    return this.http.put<Producto>(ServiciosCrd.RS_PRDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Producto[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PRDC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Producto | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_PRDC}${wsEndpoint}`;
    return this.http.delete<Producto>(url, this.httpOptions).pipe(
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
