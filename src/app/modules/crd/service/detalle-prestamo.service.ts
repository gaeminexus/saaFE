import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetallePrestamo } from '../model/detalle-prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class DetallePrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<DetallePrestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_DTPR}${wsGetById}`;
    return this.http.get<DetallePrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetallePrestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_DTPR}${wsGetById}${id}`;
    return this.http.get<DetallePrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  getByMesAnio(mes: number, anio: number): Observable<DetallePrestamo[] | null> {
    const wsGetByMesAnio = '/getByMesAnio/';
    const url = `${ServiciosCrd.RS_DTPR}${wsGetByMesAnio}${mes}/${anio}`;
    return this.http.get<DetallePrestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<DetallePrestamo | null> {
    return this.http.post<DetallePrestamo>(ServiciosCrd.RS_DTPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<DetallePrestamo | null> {
    return this.http.put<DetallePrestamo>(ServiciosCrd.RS_DTPR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetallePrestamo[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_DTPR}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<DetallePrestamo | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_DTPR}${wsGetById}`;
    return this.http.delete<DetallePrestamo>(url, this.httpOptions).pipe(
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
