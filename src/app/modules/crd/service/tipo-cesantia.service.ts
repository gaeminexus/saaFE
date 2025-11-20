import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';
import { TipoCesantia } from '../model/tipo-cesantia';

@Injectable({
  providedIn: 'root'
})
export class TipoCesantiaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<TipoCesantia[] | null> {
    const url = `${ServiciosCrd.RS_TPCS}/getAll`;
    return this.http.get<TipoCesantia[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<TipoCesantia | null> {
    const url = `${ServiciosCrd.RS_TPCS}/getId/${id}`;
    return this.http.get<TipoCesantia>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<TipoCesantia | null> {
    return this.http.post<TipoCesantia>(ServiciosCrd.RS_TPCS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<TipoCesantia | null> {
    return this.http.put<TipoCesantia>(ServiciosCrd.RS_TPCS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<TipoCesantia[] | null> {
    const url = `${ServiciosCrd.RS_TPCS}/selectByCriteria/`;
    return this.http.post<TipoCesantia[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: any): Observable<TipoCesantia | null> {
    const url = `${ServiciosCrd.RS_TPCS}/${id}`;
    return this.http.delete<TipoCesantia>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error);
  }
}
