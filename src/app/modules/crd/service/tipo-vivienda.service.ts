import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoVivienda } from '../model/tipo-vivienda';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class TipoViviendaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<TipoVivienda[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_TPVV}${wsGetById}`;
    return this.http.get<TipoVivienda[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoVivienda | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TPVV}${wsGetById}${id}`;
    return this.http.get<TipoVivienda>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<TipoVivienda | null> {
    return this.http.post<TipoVivienda>(ServiciosCrd.RS_TPVV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<TipoVivienda | null> {
    return this.http.put<TipoVivienda>(ServiciosCrd.RS_TPVV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoVivienda[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TPVV}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<TipoVivienda | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_TPVV}${wsGetById}`;
    return this.http.delete<TipoVivienda>(url, this.httpOptions).pipe(
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
