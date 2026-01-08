import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { ValorImpuestoDetalleCobro } from '../model/valor-impuesto-detalle-cobro';


@Injectable({
  providedIn: 'root'
})
export class ValorImpuestoDetalleCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ValorImpuestoDetalleCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_VITC}${wsGetById}`;
    return this.http.get<ValorImpuestoDetalleCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ValorImpuestoDetalleCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_VITC}${wsGetById}${id}`;
    return this.http.get<ValorImpuestoDetalleCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ValorImpuestoDetalleCobro | null> {
    return this.http.post<ValorImpuestoDetalleCobro>(ServiciosCxc.RS_VITC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ValorImpuestoDetalleCobro | null> {
    return this.http.put<ValorImpuestoDetalleCobro>(ServiciosCxc.RS_VITC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ValorImpuestoDetalleCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_VITC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ValorImpuestoDetalleCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_VITC}${wsEndpoint}`;
    return this.http.delete<ValorImpuestoDetalleCobro>(url, this.httpOptions).pipe(
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
