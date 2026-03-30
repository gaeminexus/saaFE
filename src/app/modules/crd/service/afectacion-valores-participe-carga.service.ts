import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { AfectacionValoresParticipeCarga } from '../model/afectacion-valores-participe-carga';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class AfectacionValoresParticipeCargaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<AfectacionValoresParticipeCarga[] | null> {
    const url = `${ServiciosCrd.RS_AVPC}/getAll`;
    return this.http.get<AfectacionValoresParticipeCarga[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<AfectacionValoresParticipeCarga | null> {
    const url = `${ServiciosCrd.RS_AVPC}/getId/${id}`;
    return this.http.get<AfectacionValoresParticipeCarga>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<AfectacionValoresParticipeCarga | null> {
    return this.http
      .post<AfectacionValoresParticipeCarga>(ServiciosCrd.RS_AVPC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<AfectacionValoresParticipeCarga | null> {
    return this.http
      .put<AfectacionValoresParticipeCarga>(ServiciosCrd.RS_AVPC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<AfectacionValoresParticipeCarga[] | null> {
    const url = `${ServiciosCrd.RS_AVPC}/selectByCriteria/`;
    return this.http.post<AfectacionValoresParticipeCarga[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<AfectacionValoresParticipeCarga | null> {
    const url = `${ServiciosCrd.RS_AVPC}/${id}`;
    return this.http.delete<AfectacionValoresParticipeCarga>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }

    return throwError(() => error.error);
  }
}
