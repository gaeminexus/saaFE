import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { NuevoParticipeG45 } from '../model/nuevo-participe-g45';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class NuevoParticipeG45Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NuevoParticipeG45[] | null> {
    const url = `${ServiciosRpr.RS_CG45}/getAll`;
    return this.http.get<NuevoParticipeG45[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<NuevoParticipeG45 | null> {
    const url = `${ServiciosRpr.RS_CG45}/getId/${id}`;
    return this.http.get<NuevoParticipeG45>(url).pipe(catchError(this.handleError));
  }

  add(datos: NuevoParticipeG45): Observable<NuevoParticipeG45 | null> {
    return this.http
      .post<NuevoParticipeG45>(ServiciosRpr.RS_CG45, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: NuevoParticipeG45): Observable<NuevoParticipeG45 | null> {
    return this.http
      .put<NuevoParticipeG45>(ServiciosRpr.RS_CG45, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<NuevoParticipeG45 | null> {
    const url = `${ServiciosRpr.RS_CG45}/${id}`;
    return this.http.delete<NuevoParticipeG45>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<NuevoParticipeG45[] | null> {
    const url = `${ServiciosRpr.RS_CG45}/selectByCriteria`;
    return this.http
      .post<NuevoParticipeG45[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
