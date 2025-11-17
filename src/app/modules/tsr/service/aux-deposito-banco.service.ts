import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { AuxDepositoBanco } from '../model/aux-deposito-banco';
import { ServiciosTsr } from './ws-tsr';


@Injectable({
  providedIn: 'root'
})
export class AuxDepositoBancoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<AuxDepositoBanco[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_ADTD}${wsGetAll}`;
    return this.http.get<AuxDepositoBanco[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<AuxDepositoBanco | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_ADTD}${wsGetById}${id}`;
    return this.http.get<AuxDepositoBanco>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<AuxDepositoBanco | null> {
    return this.http.post<AuxDepositoBanco>(ServiciosTsr.RS_ADTD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<AuxDepositoBanco | null> {
    return this.http.put<AuxDepositoBanco>(ServiciosTsr.RS_ADTD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<AuxDepositoBanco[] | null> {
    const wsSelectByCriteria = '/selectByCriteria/';
    const url = `${ServiciosTsr.RS_ADTD}${wsSelectByCriteria}`;
    return this.http.post<AuxDepositoBanco[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<AuxDepositoBanco | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_ADTD}${wsDelete}`;
    return this.http.delete<AuxDepositoBanco>(url, this.httpOptions).pipe(
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
