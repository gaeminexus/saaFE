import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { NovedadParticipeCarga } from '../model/novedad-participe-carga';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class NovedadParticipeCargaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<NovedadParticipeCarga[] | null> {
    const ws = '/getAll';
    const url = `${ServiciosCrd.RS_NVPC}${ws}`;
    return this.http.get<NovedadParticipeCarga[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<NovedadParticipeCarga | null> {
    const ws = '/getId/';
    const url = `${ServiciosCrd.RS_NVPC}${ws}${id}`;
    return this.http.get<NovedadParticipeCarga>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<NovedadParticipeCarga | null> {
    return this.http.post<NovedadParticipeCarga>(ServiciosCrd.RS_NVPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<NovedadParticipeCarga | null> {
    return this.http.put<NovedadParticipeCarga>(ServiciosCrd.RS_NVPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<NovedadParticipeCarga[] | null> {
    const ws = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_NVPC}${ws}`;
    return this.http.post<NovedadParticipeCarga[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<NovedadParticipeCarga | null> {
    const ws = '/' + id;
    const url = `${ServiciosCrd.RS_NVPC}${ws}`;
    return this.http.delete<NovedadParticipeCarga>(url, this.httpOptions).pipe(
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
