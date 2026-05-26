import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { NuevoPrestamoG46 } from '../model/nuevo-prestamo-g46';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class NuevoPrestamoG46Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NuevoPrestamoG46[] | null> {
    const url = `${ServiciosRpr.RS_CG46}/getAll`;
    return this.http.get<NuevoPrestamoG46[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<NuevoPrestamoG46 | null> {
    const url = `${ServiciosRpr.RS_CG46}/getId/${id}`;
    return this.http.get<NuevoPrestamoG46>(url).pipe(catchError(this.handleError));
  }

  add(datos: NuevoPrestamoG46): Observable<NuevoPrestamoG46 | null> {
    return this.http
      .post<NuevoPrestamoG46>(ServiciosRpr.RS_CG46, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: NuevoPrestamoG46): Observable<NuevoPrestamoG46 | null> {
    return this.http
      .put<NuevoPrestamoG46>(ServiciosRpr.RS_CG46, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<NuevoPrestamoG46 | null> {
    const url = `${ServiciosRpr.RS_CG46}/${id}`;
    return this.http.delete<NuevoPrestamoG46>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<NuevoPrestamoG46[] | null> {
    const url = `${ServiciosRpr.RS_CG46}/selectByCriteria`;
    return this.http
      .post<NuevoPrestamoG46[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
