import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { SolicitudVacaciones } from '../model/solicitud-vacaciones';

@Injectable({
  providedIn: 'root',
})
export class SolicitudVacacionesService {

 httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<SolicitudVacaciones[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_SLCT}${wsGetById}`;
    return this.http.get<SolicitudVacaciones[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<SolicitudVacaciones | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_SLCT}${wsGetById}${id}`;
    return this.http.get<SolicitudVacaciones>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<SolicitudVacaciones | null> {
    return this.http.post<SolicitudVacaciones>(ServiciosRhh.RS_SLCT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<SolicitudVacaciones | null> {
    return this.http.put<SolicitudVacaciones>(ServiciosRhh.RS_SLCT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<SolicitudVacaciones[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_SLCT}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<SolicitudVacaciones | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_SLCT}${wsEndpoint}`;
    return this.http.delete<SolicitudVacaciones>(url, this.httpOptions).pipe(
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


