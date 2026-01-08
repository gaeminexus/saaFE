import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ComposicionCuotaInicialCobro } from '../model/composicion-cuota-inicial-cobro';
import { ServiciosCxc } from './ws-cxc';

@Injectable({
  providedIn: 'root'
})
export class ComposicionCuotaInicialCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ComposicionCuotaInicialCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_CCIC}${wsGetById}`;
    return this.http.get<ComposicionCuotaInicialCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ComposicionCuotaInicialCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_CCIC}${wsGetById}${id}`;
    return this.http.get<ComposicionCuotaInicialCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ComposicionCuotaInicialCobro | null> {
    return this.http.post<ComposicionCuotaInicialCobro>(ServiciosCxc.RS_CCIC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ComposicionCuotaInicialCobro | null> {
    return this.http.put<ComposicionCuotaInicialCobro>(ServiciosCxc.RS_CCIC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ComposicionCuotaInicialCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_CCIC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ComposicionCuotaInicialCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_CCIC}${wsEndpoint}`;
    return this.http.delete<ComposicionCuotaInicialCobro>(url, this.httpOptions).pipe(
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
