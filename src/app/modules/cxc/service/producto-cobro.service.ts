import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { ProductoCobro } from '../model/producto-cobro';



@Injectable({
  providedIn: 'root'
})
export class ProductoCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ProductoCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_PRDC}${wsGetById}`;
    return this.http.get<ProductoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ProductoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_PRDC}${wsGetById}${id}`;
    return this.http.get<ProductoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ProductoCobro | null> {
    return this.http.post<ProductoCobro>(ServiciosCxc.RS_PRDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ProductoCobro | null> {
    return this.http.put<ProductoCobro>(ServiciosCxc.RS_PRDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ProductoCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_PRDC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ProductoCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_PRDC}${wsEndpoint}`;
    return this.http.delete<ProductoCobro>(url, this.httpOptions).pipe(
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
