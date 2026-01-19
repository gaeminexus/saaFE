import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Catalogo } from '../model/catalogo';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class CatalogoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Catalogo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_CTLG}${wsGetById}`;
    return this.http.get<Catalogo[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Catalogo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_CTLG}${wsGetById}${id}`;
    return this.http.get<Catalogo>(url).pipe(catchError(this.handleError));
  }

  /** POST: add new record */
  add(datos: any): Observable<Catalogo | null> {
    return this.http
      .post<Catalogo>(ServiciosRhh.RS_CTLG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** PUT: update record */
  update(datos: any): Observable<Catalogo | null> {
    return this.http
      .put<Catalogo>(ServiciosRhh.RS_CTLG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<Catalogo[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_CTLG}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** DELETE */
  delete(id: any): Observable<Catalogo | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_CTLG}${wsEndpoint}`;
    return this.http.delete<Catalogo>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
