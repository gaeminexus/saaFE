import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';
import { TipoGenero } from '../model/tipo-genero';

@Injectable({
  providedIn: 'root'
})
export class TipoGeneroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<TipoGenero[] | null> {
    const url = `${ServiciosCrd.RS_TPGN}/getAll`;
    return this.http.get<TipoGenero[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<TipoGenero | null> {
    const url = `${ServiciosCrd.RS_TPGN}/getId/${id}`;
    return this.http.get<TipoGenero>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<TipoGenero | null> {
    return this.http.post<TipoGenero>(ServiciosCrd.RS_TPGN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<TipoGenero | null> {
    return this.http.put<TipoGenero>(ServiciosCrd.RS_TPGN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<TipoGenero[] | null> {
    const url = `${ServiciosCrd.RS_TPGN}/selectByCriteria/`;
    return this.http.post<TipoGenero[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: any): Observable<TipoGenero | null> {
    const url = `${ServiciosCrd.RS_TPGN}/${id}`;
    return this.http.delete<TipoGenero>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error);
  }
}
