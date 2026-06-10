import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { Hmpr } from '../model/hmpr';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class HmprService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Hmpr[] | null> {
    const url = `${ServiciosRpr.RS_HMPR}/getAll`;
    return this.http.get<Hmpr[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Hmpr | null> {
    const url = `${ServiciosRpr.RS_HMPR}/getId/${id}`;
    return this.http.get<Hmpr>(url).pipe(catchError(this.handleError));
  }

  add(datos: Hmpr): Observable<Hmpr | null> {
    return this.http
      .post<Hmpr>(ServiciosRpr.RS_HMPR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Hmpr): Observable<Hmpr | null> {
    return this.http
      .put<Hmpr>(ServiciosRpr.RS_HMPR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<Hmpr | null> {
    const url = `${ServiciosRpr.RS_HMPR}/${id}`;
    return this.http
      .delete<Hmpr>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<Hmpr[] | null> {
    const url = `${ServiciosRpr.RS_HMPR}/selectByCriteria`;
    return this.http
      .post<Hmpr[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
