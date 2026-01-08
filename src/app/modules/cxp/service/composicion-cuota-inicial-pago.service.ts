import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ComposicionCuotaInicialPago } from '../model/composicion_cuota_inicial_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class ComposicionCuotaInicialPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ComposicionCuotaInicialPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_CCIP}${wsGetById}`;
    return this.http.get<ComposicionCuotaInicialPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ComposicionCuotaInicialPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_CCIP}${wsGetById}${id}`;
    return this.http.get<ComposicionCuotaInicialPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ComposicionCuotaInicialPago | null> {
    return this.http.post<ComposicionCuotaInicialPago>(ServiciosCxp.RS_CCIP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ComposicionCuotaInicialPago | null> {
    return this.http.put<ComposicionCuotaInicialPago>(ServiciosCxp.RS_CCIP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ComposicionCuotaInicialPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_CCIP}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ComposicionCuotaInicialPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_CCIP}${wsEndpoint}`;
    return this.http.delete<ComposicionCuotaInicialPago>(url, this.httpOptions).pipe(
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
