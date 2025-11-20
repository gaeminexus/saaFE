import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { MotivoPrestamo } from '../model/motivo-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class MotivoPrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<MotivoPrestamo[] | null> {
    const url = `${ServiciosCrd.RS_MTVP}/getAll`;
    return this.http.get<MotivoPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<MotivoPrestamo | null> {
    const url = `${ServiciosCrd.RS_MTVP}/getId/${id}`;
    return this.http.get<MotivoPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<MotivoPrestamo | null> {
    return this.http.post<MotivoPrestamo>(ServiciosCrd.RS_MTVP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<MotivoPrestamo | null> {
    return this.http.put<MotivoPrestamo>(ServiciosCrd.RS_MTVP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<MotivoPrestamo[] | null> {
    const url = `${ServiciosCrd.RS_MTVP}/selectByCriteria/`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<MotivoPrestamo | null> {
    const url = `${ServiciosCrd.RS_MTVP}/${datos}`;
    return this.http.delete<MotivoPrestamo>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error);
  }
}
