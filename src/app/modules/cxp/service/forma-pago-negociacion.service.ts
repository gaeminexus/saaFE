import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { FormaPagoNegociacion } from '../model/forma-pago-negociacion';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class FormaPagoNegociacionService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getById(id: number): Observable<FormaPagoNegociacion | null> {
    return this.http.get<FormaPagoNegociacion>(`${ServiciosCxp.RS_FPNG}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByNegociacion(idNegociacion: number): Observable<FormaPagoNegociacion[] | null> {
    return this.http.get<FormaPagoNegociacion[]>(`${ServiciosCxp.RS_FPNG}/getByNegociacion/${idNegociacion}`).pipe(catchError(this.handleError));
  }

  selectByCriteria(criteria: any): Observable<FormaPagoNegociacion[] | null> {
    return this.http.post<FormaPagoNegociacion[]>(`${ServiciosCxp.RS_FPNG}/selectByCriteria/`, criteria, this.httpOptions).pipe(catchError(this.handleError));
  }

  add(item: Partial<FormaPagoNegociacion>): Observable<FormaPagoNegociacion | null> {
    return this.http.post<FormaPagoNegociacion>(`${ServiciosCxp.RS_FPNG}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(item: Partial<FormaPagoNegociacion>): Observable<FormaPagoNegociacion | null> {
    return this.http.put<FormaPagoNegociacion>(`${ServiciosCxp.RS_FPNG}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${ServiciosCxp.RS_FPNG}/delete/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
