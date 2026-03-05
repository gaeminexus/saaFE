import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { EstadoCuotaPrestamo } from '../model/estado-cuota-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class EstadoCuotaPrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<EstadoCuotaPrestamo[] | null> {
    const url = `${ServiciosCrd.RS_ESCP}/getAll`;
    return this.http.get<EstadoCuotaPrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<EstadoCuotaPrestamo | null> {
    const url = `${ServiciosCrd.RS_ESCP}/getId/${id}`;
    return this.http.get<EstadoCuotaPrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<EstadoCuotaPrestamo | null> {
    return this.http.post<EstadoCuotaPrestamo>(ServiciosCrd.RS_ESCP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<EstadoCuotaPrestamo | null> {
    return this.http.put<EstadoCuotaPrestamo>(ServiciosCrd.RS_ESCP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<EstadoCuotaPrestamo[] | null> {
    const url = `${ServiciosCrd.RS_ESCP}/selectByCriteria/`;
    return this.http.post<EstadoCuotaPrestamo[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<EstadoCuotaPrestamo | null> {
    const url = `${ServiciosCrd.RS_ESCP}/${id}`;
    return this.http.delete<EstadoCuotaPrestamo>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
