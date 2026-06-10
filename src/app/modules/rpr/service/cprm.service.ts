import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { Cprm } from '../model/cprm';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class CprmService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Cprm[] | null> {
    const url = `${ServiciosRpr.RS_CPRM}/getAll`;
    return this.http.get<Cprm[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Cprm | null> {
    const url = `${ServiciosRpr.RS_CPRM}/getId/${id}`;
    return this.http.get<Cprm>(url).pipe(catchError(this.handleError));
  }

  add(datos: Cprm): Observable<Cprm | null> {
    return this.http
      .post<Cprm>(ServiciosRpr.RS_CPRM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Cprm): Observable<Cprm | null> {
    return this.http
      .put<Cprm>(ServiciosRpr.RS_CPRM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<Cprm | null> {
    const url = `${ServiciosRpr.RS_CPRM}/${id}`;
    return this.http
      .delete<Cprm>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<Cprm[] | null> {
    const url = `${ServiciosRpr.RS_CPRM}/selectByCriteria`;
    return this.http
      .post<Cprm[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
