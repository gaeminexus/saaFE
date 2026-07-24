import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CuentaBancariaTitular } from '../model/cuenta-bancaria-titular';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class CuentaBancariaTitularService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CuentaBancariaTitular[] | null> {
    const url = `${ServiciosTsr.RS_CTBN}/getAll`;
    return this.http.get<CuentaBancariaTitular[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<CuentaBancariaTitular | null> {
    const url = `${ServiciosTsr.RS_CTBN}/getId/${id}`;
    return this.http.get<CuentaBancariaTitular>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<CuentaBancariaTitular | null> {
    return this.http
      .post<CuentaBancariaTitular>(ServiciosTsr.RS_CTBN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<CuentaBancariaTitular | null> {
    return this.http
      .put<CuentaBancariaTitular>(ServiciosTsr.RS_CTBN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<CuentaBancariaTitular | null> {
    const url = `${ServiciosTsr.RS_CTBN}/${id}`;
    return this.http.delete<CuentaBancariaTitular>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<CuentaBancariaTitular[] | null> {
    const url = `${ServiciosTsr.RS_CTBN}/selectByCriteria/`;
    return this.http
      .post<CuentaBancariaTitular[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
