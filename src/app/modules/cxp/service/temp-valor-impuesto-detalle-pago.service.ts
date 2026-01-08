import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TempValorImpuestoDetallePago } from '../model/temp_valor_impuesto_detalle_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class TempValorImpuestoDetallePagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempValorImpuestoDetallePago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_TITP}${wsGetById}`;
    return this.http.get<TempValorImpuestoDetallePago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempValorImpuestoDetallePago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_TITP}${wsGetById}${id}`;
    return this.http.get<TempValorImpuestoDetallePago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempValorImpuestoDetallePago | null> {
    return this.http.post<TempValorImpuestoDetallePago>(ServiciosCxp.RS_TITP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempValorImpuestoDetallePago | null> {
    return this.http.put<TempValorImpuestoDetallePago>(ServiciosCxp.RS_TITP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempValorImpuestoDetallePago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_TITP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempValorImpuestoDetallePago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_TITP}${wsEndpoint}`;
    return this.http.delete<TempValorImpuestoDetallePago>(url, this.httpOptions).pipe(
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
