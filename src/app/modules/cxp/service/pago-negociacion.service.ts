import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PagoNegociacion } from '../model/pago-negociacion';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class PagoNegociacionService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getById(id: number): Observable<PagoNegociacion | null> {
    return this.http.get<PagoNegociacion>(`${ServiciosCxp.RS_PGNG}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByCuota(idFormaPago: number): Observable<PagoNegociacion[] | null> {
    return this.http.get<PagoNegociacion[]>(`${ServiciosCxp.RS_PGNG}/getByCuota/${idFormaPago}`).pipe(catchError(this.handleError));
  }

  selectByCriteria(criteria: any): Observable<PagoNegociacion[] | null> {
    return this.http.post<PagoNegociacion[]>(`${ServiciosCxp.RS_PGNG}/selectByCriteria/`, criteria, this.httpOptions).pipe(catchError(this.handleError));
  }

  add(item: Partial<PagoNegociacion>): Observable<PagoNegociacion | null> {
    return this.http.post<PagoNegociacion>(`${ServiciosCxp.RS_PGNG}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(item: Partial<PagoNegociacion>): Observable<PagoNegociacion | null> {
    return this.http.put<PagoNegociacion>(`${ServiciosCxp.RS_PGNG}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${ServiciosCxp.RS_PGNG}/delete/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
