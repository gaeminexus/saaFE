import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';
import { TipoCalificacionCredito } from '../model/tipo-calificacion-credito';

@Injectable({
  providedIn: 'root'
})
export class TipoCalificacionCreditoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<TipoCalificacionCredito[] | null> {
    const url = `${ServiciosCrd.RS_TPCL}/getAll`;
    return this.http.get<TipoCalificacionCredito[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoCalificacionCredito | null> {
    const url = `${ServiciosCrd.RS_TPCL}/getId/${id}`;
    return this.http.get<TipoCalificacionCredito>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<TipoCalificacionCredito | null> {
    return this.http.post<TipoCalificacionCredito>(ServiciosCrd.RS_TPCL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<TipoCalificacionCredito | null> {
    return this.http.put<TipoCalificacionCredito>(ServiciosCrd.RS_TPCL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoCalificacionCredito[] | null> {
    const url = `${ServiciosCrd.RS_TPCL}/selectByCriteria/`;
    return this.http.post<TipoCalificacionCredito[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<TipoCalificacionCredito | null> {
    const url = `${ServiciosCrd.RS_TPCL}/${id}`;
    return this.http.delete<TipoCalificacionCredito>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error);
  }
}
