import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { TempComposicionCuotaInicialCobro } from '../model/temp-composicion-cuota-inicial-cobro';


@Injectable({
  providedIn: 'root'
})
export class TempComposicionCuotaInicialCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempComposicionCuotaInicialCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_TCIC}${wsGetById}`;
    return this.http.get<TempComposicionCuotaInicialCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempComposicionCuotaInicialCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_TCIC}${wsGetById}${id}`;
    return this.http.get<TempComposicionCuotaInicialCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempComposicionCuotaInicialCobro | null> {
    return this.http.post<TempComposicionCuotaInicialCobro>(ServiciosCxc.RS_TCIC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempComposicionCuotaInicialCobro | null> {
    return this.http.put<TempComposicionCuotaInicialCobro>(ServiciosCxc.RS_TCIC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempComposicionCuotaInicialCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_TCIC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempComposicionCuotaInicialCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_TCIC}${wsEndpoint}`;
    return this.http.delete<TempComposicionCuotaInicialCobro>(url, this.httpOptions).pipe(
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
