import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { SaldoOperacionG48 } from '../model/saldo-operacion-g48';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class SaldoOperacionG48Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<SaldoOperacionG48[] | null> {
    const url = `${ServiciosRpr.RS_CG48}/getAll`;
    return this.http.get<SaldoOperacionG48[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<SaldoOperacionG48 | null> {
    const url = `${ServiciosRpr.RS_CG48}/getId/${id}`;
    return this.http.get<SaldoOperacionG48>(url).pipe(catchError(this.handleError));
  }

  add(datos: SaldoOperacionG48): Observable<SaldoOperacionG48 | null> {
    return this.http
      .post<SaldoOperacionG48>(ServiciosRpr.RS_CG48, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: SaldoOperacionG48): Observable<SaldoOperacionG48 | null> {
    return this.http
      .put<SaldoOperacionG48>(ServiciosRpr.RS_CG48, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<SaldoOperacionG48 | null> {
    const url = `${ServiciosRpr.RS_CG48}/${id}`;
    return this.http.delete<SaldoOperacionG48>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<SaldoOperacionG48[] | null> {
    const url = `${ServiciosRpr.RS_CG48}/selectByCriteria`;
    return this.http
      .post<SaldoOperacionG48[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
