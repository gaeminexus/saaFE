import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { SaldoVacaciones } from '../model/saldo-vacaciones';

@Injectable({
  providedIn: 'root',
})
export class SaldoVacacionesService {


 httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<SaldoVacaciones[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_SLDV}${wsGetById}`;
    return this.http.get<SaldoVacaciones[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<SaldoVacaciones | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_SLDV}${wsGetById}${id}`;
    return this.http.get<SaldoVacaciones>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<SaldoVacaciones | null> {
    return this.http.post<SaldoVacaciones>(ServiciosRhh.RS_SLDV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<SaldoVacaciones | null> {
    return this.http.put<SaldoVacaciones>(ServiciosRhh.RS_SLDV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<SaldoVacaciones[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_SLDV}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<SaldoVacaciones | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_SLDV}${wsEndpoint}`;
    return this.http.delete<SaldoVacaciones>(url, this.httpOptions).pipe(
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


