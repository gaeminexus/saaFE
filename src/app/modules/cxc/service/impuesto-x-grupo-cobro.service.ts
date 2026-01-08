import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { ImpuestoXGrupoCobro } from '../model/impuesto-x-grupo-cobro';



@Injectable({
  providedIn: 'root'
})
export class ImpuestoXGrupoCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ImpuestoXGrupoCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_IXGC}${wsGetById}`;
    return this.http.get<ImpuestoXGrupoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ImpuestoXGrupoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_IXGC}${wsGetById}${id}`;
    return this.http.get<ImpuestoXGrupoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ImpuestoXGrupoCobro | null> {
    return this.http.post<ImpuestoXGrupoCobro>(ServiciosCxc.RS_IXGC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ImpuestoXGrupoCobro | null> {
    return this.http.put<ImpuestoXGrupoCobro>(ServiciosCxc.RS_IXGC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ImpuestoXGrupoCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_IXGC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ImpuestoXGrupoCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_IXGC}${wsEndpoint}`;
    return this.http.delete<ImpuestoXGrupoCobro>(url, this.httpOptions).pipe(
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
