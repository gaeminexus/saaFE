import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { Cjbm } from '../model/cjbm';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class CjbmService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Cjbm[] | null> {
    const url = `${ServiciosRpr.RS_CJBM}/getAll`;
    return this.http.get<Cjbm[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Cjbm | null> {
    const url = `${ServiciosRpr.RS_CJBM}/getId/${id}`;
    return this.http.get<Cjbm>(url).pipe(catchError(this.handleError));
  }

  add(datos: Cjbm): Observable<Cjbm | null> {
    return this.http
      .post<Cjbm>(ServiciosRpr.RS_CJBM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Cjbm): Observable<Cjbm | null> {
    return this.http
      .put<Cjbm>(ServiciosRpr.RS_CJBM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<Cjbm | null> {
    const url = `${ServiciosRpr.RS_CJBM}/${id}`;
    return this.http
      .delete<Cjbm>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<Cjbm[] | null> {
    const url = `${ServiciosRpr.RS_CJBM}/selectByCriteria`;
    return this.http
      .post<Cjbm[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
