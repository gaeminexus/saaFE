import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoIdentificacion } from '../model/tipo-identificacion';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class TipoIdentificacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<TipoIdentificacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_TPDN}${wsGetById}`;
    return this.http.get<TipoIdentificacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoIdentificacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TPDN}${wsGetById}${id}`;
    return this.http.get<TipoIdentificacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<TipoIdentificacion | null> {
    return this.http.post<TipoIdentificacion>(ServiciosCrd.RS_TPDN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<TipoIdentificacion | null> {
    return this.http.put<TipoIdentificacion>(ServiciosCrd.RS_TPDN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoIdentificacion[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TPDN}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<TipoIdentificacion | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_TPDN}${wsGetById}`;
    return this.http.delete<TipoIdentificacion>(url, this.httpOptions).pipe(
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
