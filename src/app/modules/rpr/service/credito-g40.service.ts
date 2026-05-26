import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { CreditoG40 } from '../model/credito-g40';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class CreditoG40Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CreditoG40[] | null> {
    const url = `${ServiciosRpr.RS_CG40}/getAll`;
    return this.http.get<CreditoG40[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<CreditoG40 | null> {
    const url = `${ServiciosRpr.RS_CG40}/getId/${id}`;
    return this.http.get<CreditoG40>(url).pipe(catchError(this.handleError));
  }

  add(datos: CreditoG40): Observable<CreditoG40 | null> {
    return this.http
      .post<CreditoG40>(ServiciosRpr.RS_CG40, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: CreditoG40): Observable<CreditoG40 | null> {
    return this.http
      .put<CreditoG40>(ServiciosRpr.RS_CG40, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<CreditoG40 | null> {
    const url = `${ServiciosRpr.RS_CG40}/${id}`;
    return this.http.delete<CreditoG40>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<CreditoG40[] | null> {
    const url = `${ServiciosRpr.RS_CG40}/selectByCriteria`;
    return this.http
      .post<CreditoG40[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
