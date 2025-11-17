import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Prestamo } from '../model/prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class PrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<Prestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}`;
    return this.http.get<Prestamo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Prestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}${id}`;
    return this.http.get<Prestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<Prestamo | null> {
    return this.http.post<Prestamo>(ServiciosCrd.RS_PRST, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<Prestamo | null> {
    return this.http.put<Prestamo>(ServiciosCrd.RS_PRST, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Prestamo[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<Prestamo | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}`;
    return this.http.delete<Prestamo>(url, this.httpOptions).pipe(
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
