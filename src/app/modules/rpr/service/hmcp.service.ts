import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { Hmcp } from '../model/hmcp';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class HmcpService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Hmcp[] | null> {
    const url = `${ServiciosRpr.RS_HMCP}/getAll`;
    return this.http.get<Hmcp[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Hmcp | null> {
    const url = `${ServiciosRpr.RS_HMCP}/getId/${id}`;
    return this.http.get<Hmcp>(url).pipe(catchError(this.handleError));
  }

  add(datos: Hmcp): Observable<Hmcp | null> {
    return this.http
      .post<Hmcp>(ServiciosRpr.RS_HMCP, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Hmcp): Observable<Hmcp | null> {
    return this.http
      .put<Hmcp>(ServiciosRpr.RS_HMCP, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: string): Observable<Hmcp | null> {
    const url = `${ServiciosRpr.RS_HMCP}/${id}`;
    return this.http
      .delete<Hmcp>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<Hmcp[] | null> {
    const url = `${ServiciosRpr.RS_HMCP}/selectByCriteria`;
    return this.http
      .post<Hmcp[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
