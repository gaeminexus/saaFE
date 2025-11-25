import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Comentario } from '../model/comentario';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class ComentarioService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Comentario[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_CMNT}${wsGetById}`;
    return this.http.get<Comentario[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Comentario | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_CMNT}${wsGetById}${id}`;
    return this.http.get<Comentario>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Comentario | null> {
    return this.http.post<Comentario>(ServiciosCrd.RS_CMNT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Comentario | null> {
    return this.http.put<Comentario>(ServiciosCrd.RS_CMNT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Comentario[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CMNT}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Comentario | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_CMNT}${wsEndpoint}`;
    return this.http.delete<Comentario>(url, this.httpOptions).pipe(
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
