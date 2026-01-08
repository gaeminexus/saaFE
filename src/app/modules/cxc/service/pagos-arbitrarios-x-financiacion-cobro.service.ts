import { PagosArbitrariosXFinanciacionCobro } from './../model/pagos-arbitrarios-x-financiacion-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';



@Injectable({
  providedIn: 'root'
})
export class PagosArbitrariosXFinanciacionCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<PagosArbitrariosXFinanciacionCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_PAFC}${wsGetById}`;
    return this.http.get<PagosArbitrariosXFinanciacionCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<PagosArbitrariosXFinanciacionCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_PAFC}${wsGetById}${id}`;
    return this.http.get<PagosArbitrariosXFinanciacionCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<PagosArbitrariosXFinanciacionCobro | null> {
    return this.http.post<PagosArbitrariosXFinanciacionCobro>(ServiciosCxc.RS_PAFC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<PagosArbitrariosXFinanciacionCobro | null> {
    return this.http.put<PagosArbitrariosXFinanciacionCobro>(ServiciosCxc.RS_PAFC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<PagosArbitrariosXFinanciacionCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_PAFC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<PagosArbitrariosXFinanciacionCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_PAFC}${wsEndpoint}`;
    return this.http.delete<PagosArbitrariosXFinanciacionCobro>(url, this.httpOptions).pipe(
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
