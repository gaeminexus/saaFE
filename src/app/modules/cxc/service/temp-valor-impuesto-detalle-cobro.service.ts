import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { TempValorImpuestoDetalleCobro } from '../model/temp-valor-impuesto-detalle-cobro';


@Injectable({
  providedIn: 'root'
})
export class TempValorImpuestoDetalleCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempValorImpuestoDetalleCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_TITC}${wsGetById}`;
    return this.http.get<TempValorImpuestoDetalleCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempValorImpuestoDetalleCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_TITC}${wsGetById}${id}`;
    return this.http.get<TempValorImpuestoDetalleCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempValorImpuestoDetalleCobro | null> {
    return this.http.post<TempValorImpuestoDetalleCobro>(ServiciosCxc.RS_TITC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempValorImpuestoDetalleCobro | null> {
    return this.http.put<TempValorImpuestoDetalleCobro>(ServiciosCxc.RS_TITC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempValorImpuestoDetalleCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_TITC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempValorImpuestoDetalleCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_TITC}${wsEndpoint}`;
    return this.http.delete<TempValorImpuestoDetalleCobro>(url, this.httpOptions).pipe(
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
