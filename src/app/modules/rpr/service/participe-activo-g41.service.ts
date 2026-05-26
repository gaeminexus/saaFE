import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { ParticipeActivoG41 } from '../model/participe-activo-g41';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class ParticipeActivoG41Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParticipeActivoG41[] | null> {
    const url = `${ServiciosRpr.RS_CG41}/getAll`;
    return this.http.get<ParticipeActivoG41[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<ParticipeActivoG41 | null> {
    const url = `${ServiciosRpr.RS_CG41}/getId/${id}`;
    return this.http.get<ParticipeActivoG41>(url).pipe(catchError(this.handleError));
  }

  add(datos: ParticipeActivoG41): Observable<ParticipeActivoG41 | null> {
    return this.http
      .post<ParticipeActivoG41>(ServiciosRpr.RS_CG41, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: ParticipeActivoG41): Observable<ParticipeActivoG41 | null> {
    return this.http
      .put<ParticipeActivoG41>(ServiciosRpr.RS_CG41, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<ParticipeActivoG41 | null> {
    const url = `${ServiciosRpr.RS_CG41}/${id}`;
    return this.http.delete<ParticipeActivoG41>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<ParticipeActivoG41[] | null> {
    const url = `${ServiciosRpr.RS_CG41}/selectByCriteria`;
    return this.http
      .post<ParticipeActivoG41[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
