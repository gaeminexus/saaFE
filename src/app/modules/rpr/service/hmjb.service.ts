import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { Hmjb } from '../model/hmjb';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class HmjbService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Hmjb[] | null> {
    const url = `${ServiciosRpr.RS_HMJB}/getAll`;
    return this.http.get<Hmjb[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Hmjb | null> {
    const url = `${ServiciosRpr.RS_HMJB}/getId/${id}`;
    return this.http.get<Hmjb>(url).pipe(catchError(this.handleError));
  }

  add(datos: Hmjb): Observable<Hmjb | null> {
    return this.http
      .post<Hmjb>(ServiciosRpr.RS_HMJB, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Hmjb): Observable<Hmjb | null> {
    return this.http
      .put<Hmjb>(ServiciosRpr.RS_HMJB, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<Hmjb | null> {
    const url = `${ServiciosRpr.RS_HMJB}/${id}`;
    return this.http
      .delete<Hmjb>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<Hmjb[] | null> {
    const url = `${ServiciosRpr.RS_HMJB}/selectByCriteria`;
    return this.http
      .post<Hmjb[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
