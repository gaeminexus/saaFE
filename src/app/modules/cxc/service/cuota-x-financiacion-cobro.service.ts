import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { CuotaXFinanciacionCobro } from '../model/cuota-x-financiacion-cobro';

@Injectable({
  providedIn: 'root'
})
export class CuotaXFinanciacionCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<CuotaXFinanciacionCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_CXDC}${wsGetById}`;
    return this.http.get<CuotaXFinanciacionCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<CuotaXFinanciacionCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_CXDC}${wsGetById}${id}`;
    return this.http.get<CuotaXFinanciacionCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<CuotaXFinanciacionCobro | null> {
    return this.http.post<CuotaXFinanciacionCobro>(ServiciosCxc.RS_CXDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<CuotaXFinanciacionCobro | null> {
    return this.http.put<CuotaXFinanciacionCobro>(ServiciosCxc.RS_CXDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<CuotaXFinanciacionCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_CXDC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<CuotaXFinanciacionCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_CXDC}${wsEndpoint}`;
    return this.http.delete<CuotaXFinanciacionCobro>(url, this.httpOptions).pipe(
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
