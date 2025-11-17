import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoHidrocarburifica } from '../model/tipo-hidrocarburifica';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class TipoHidrocarburificaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<TipoHidrocarburifica[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_TPHD}${wsGetById}`;
    return this.http.get<TipoHidrocarburifica[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TipoHidrocarburifica | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TPHD}${wsGetById}${id}`;
    return this.http.get<TipoHidrocarburifica>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<TipoHidrocarburifica | null> {
    return this.http.post<TipoHidrocarburifica>(ServiciosCrd.RS_TPHD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<TipoHidrocarburifica | null> {
    return this.http.put<TipoHidrocarburifica>(ServiciosCrd.RS_TPHD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TipoHidrocarburifica[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TPHD}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<TipoHidrocarburifica | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_TPHD}${wsGetById}`;
    return this.http.delete<TipoHidrocarburifica>(url, this.httpOptions).pipe(
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
