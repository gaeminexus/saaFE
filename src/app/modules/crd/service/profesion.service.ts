import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Profesion } from '../model/profesion';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class ProfesionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<Profesion[] | null> {
    const url = `${ServiciosCrd.RS_PRFS}/getAll`;
    return this.http.get<Profesion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Profesion | null> {
    const url = `${ServiciosCrd.RS_PRFS}/getId/${id}`;
    return this.http.get<Profesion>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<Profesion | null> {
    return this.http.post<Profesion>(ServiciosCrd.RS_PRFS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<Profesion | null> {
    return this.http.put<Profesion>(ServiciosCrd.RS_PRFS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Profesion[] | null> {
    const url = `${ServiciosCrd.RS_PRFS}/selectByCriteria/`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<Profesion | null> {
    const url = `${ServiciosCrd.RS_PRFS}/${datos}`;
    return this.http.delete<Profesion>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error);
  }
}
