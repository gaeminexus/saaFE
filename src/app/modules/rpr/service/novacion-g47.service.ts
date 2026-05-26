import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { NovacionG47 } from '../model/novacion-g47';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class NovacionG47Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NovacionG47[] | null> {
    const url = `${ServiciosRpr.RS_CG47}/getAll`;
    return this.http.get<NovacionG47[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<NovacionG47 | null> {
    const url = `${ServiciosRpr.RS_CG47}/getId/${id}`;
    return this.http.get<NovacionG47>(url).pipe(catchError(this.handleError));
  }

  add(datos: NovacionG47): Observable<NovacionG47 | null> {
    return this.http
      .post<NovacionG47>(ServiciosRpr.RS_CG47, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: NovacionG47): Observable<NovacionG47 | null> {
    return this.http
      .put<NovacionG47>(ServiciosRpr.RS_CG47, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<NovacionG47 | null> {
    const url = `${ServiciosRpr.RS_CG47}/${id}`;
    return this.http.delete<NovacionG47>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<NovacionG47[] | null> {
    const url = `${ServiciosRpr.RS_CG47}/selectByCriteria`;
    return this.http
      .post<NovacionG47[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
