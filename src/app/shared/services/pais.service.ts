import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosShare } from './ws-share';
import { Pais } from '../model/pais';

@Injectable({
  providedIn: 'root'
})
export class PaisService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<Pais[] | null> {
    const url = `${ServiciosShare.RS_PSSS}/getAll`;
    return this.http.get<Pais[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Pais | null> {
    const url = `${ServiciosShare.RS_PSSS}/getId/${id}`;
    return this.http.get<Pais>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<Pais | null> {
    return this.http.post<Pais>(ServiciosShare.RS_PSSS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<Pais | null> {
    return this.http.put<Pais>(ServiciosShare.RS_PSSS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Pais[] | null> {
    const url = `${ServiciosShare.RS_PSSS}/selectByCriteria/`;
    return this.http.post<Pais[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<Pais | null> {
    const url = `${ServiciosShare.RS_PSSS}/${id}`;
    return this.http.delete<Pais>(url, this.httpOptions).pipe(
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
