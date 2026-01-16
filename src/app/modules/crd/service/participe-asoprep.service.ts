import { Injectable } from '@angular/core';
import { ParticipeAsoprep } from '../model/participe-asoprep';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root',
})
export class ParticipeAsoprepService {


    httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ParticipeAsoprep[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRAS}${wsGetById}`;
    return this.http.get<ParticipeAsoprep[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ParticipeAsoprep | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRAS}${wsGetById}${id}`;
    return this.http.get<ParticipeAsoprep>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ParticipeAsoprep | null> {
    return this.http.post<ParticipeAsoprep>(ServiciosCrd.RS_PRAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ParticipeAsoprep | null> {
    return this.http.put<ParticipeAsoprep>(ServiciosCrd.RS_PRAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ParticipeAsoprep[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PRAS}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ParticipeAsoprep | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_PRAS}${wsEndpoint}`;
    return this.http.delete<ParticipeAsoprep>(url, this.httpOptions).pipe(
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
