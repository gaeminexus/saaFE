import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { AporteRetenciones } from '../model/aportes-retenciones';

@Injectable({
  providedIn: 'root',
})
export class AporteRetencionesService {
    httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<AporteRetenciones[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_PRTE}${wsGetById}`;
    return this.http.get<AporteRetenciones[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<AporteRetenciones | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_PRTE}${wsGetById}${id}`;
    return this.http.get<AporteRetenciones>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<AporteRetenciones | null> {
    return this.http.post<AporteRetenciones>(ServiciosRhh.RS_PRTE, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<AporteRetenciones | null> {
    return this.http.put<AporteRetenciones>(ServiciosRhh.RS_PRTE, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<AporteRetenciones[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_PRTE}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<AporteRetenciones | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_PRTE}${wsEndpoint}`;
    return this.http.delete<AporteRetenciones>(url, this.httpOptions).pipe(
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
