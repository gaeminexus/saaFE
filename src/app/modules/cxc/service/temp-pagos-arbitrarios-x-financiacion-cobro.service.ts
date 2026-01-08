import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { TempPagosArbitrariosXFinanciacionCobro } from '../model/temp-pagos-arbitrarios-x-financiacion-cobro';


@Injectable({
  providedIn: 'root'
})
export class TempPagosArbitrariosXFinanciacionCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempPagosArbitrariosXFinanciacionCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_TPFC}${wsGetById}`;
    return this.http.get<TempPagosArbitrariosXFinanciacionCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempPagosArbitrariosXFinanciacionCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_TPFC}${wsGetById}${id}`;
    return this.http.get<TempPagosArbitrariosXFinanciacionCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempPagosArbitrariosXFinanciacionCobro | null> {
    return this.http.post<TempPagosArbitrariosXFinanciacionCobro>(ServiciosCxc.RS_TPFC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempPagosArbitrariosXFinanciacionCobro | null> {
    return this.http.put<TempPagosArbitrariosXFinanciacionCobro>(ServiciosCxc.RS_TPFC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempPagosArbitrariosXFinanciacionCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_TPFC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempPagosArbitrariosXFinanciacionCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_TPFC}${wsEndpoint}`;
    return this.http.delete<TempPagosArbitrariosXFinanciacionCobro>(url, this.httpOptions).pipe(
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
