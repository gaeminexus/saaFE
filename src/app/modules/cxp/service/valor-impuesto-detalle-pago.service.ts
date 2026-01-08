import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ValorImpuestoDetallePago } from '../model/valor_impuesto_detalle_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class ValorImpuestoDetallePagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ValorImpuestoDetallePago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_VITP}${wsGetById}`;
    return this.http.get<ValorImpuestoDetallePago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ValorImpuestoDetallePago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_VITP}${wsGetById}${id}`;
    return this.http.get<ValorImpuestoDetallePago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ValorImpuestoDetallePago | null> {
    return this.http.post<ValorImpuestoDetallePago>(ServiciosCxp.RS_VITP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ValorImpuestoDetallePago | null> {
    return this.http.put<ValorImpuestoDetallePago>(ServiciosCxp.RS_VITP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ValorImpuestoDetallePago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_VITP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ValorImpuestoDetallePago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_VITP}${wsEndpoint}`;
    return this.http.delete<ValorImpuestoDetallePago>(url, this.httpOptions).pipe(
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
