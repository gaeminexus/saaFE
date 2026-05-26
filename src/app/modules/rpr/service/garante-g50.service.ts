import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { GaranteG50 } from '../model/garante-g50';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class GaranteG50Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<GaranteG50[] | null> {
    const url = `${ServiciosRpr.RS_CG50}/getAll`;
    return this.http.get<GaranteG50[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<GaranteG50 | null> {
    const url = `${ServiciosRpr.RS_CG50}/getId/${id}`;
    return this.http.get<GaranteG50>(url).pipe(catchError(this.handleError));
  }

  add(datos: GaranteG50): Observable<GaranteG50 | null> {
    return this.http
      .post<GaranteG50>(ServiciosRpr.RS_CG50, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: GaranteG50): Observable<GaranteG50 | null> {
    return this.http
      .put<GaranteG50>(ServiciosRpr.RS_CG50, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<GaranteG50 | null> {
    const url = `${ServiciosRpr.RS_CG50}/${id}`;
    return this.http.delete<GaranteG50>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<GaranteG50[] | null> {
    const url = `${ServiciosRpr.RS_CG50}/selectByCriteria`;
    return this.http
      .post<GaranteG50[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
