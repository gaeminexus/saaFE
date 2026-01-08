import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { DocumentoCobro } from '../model/documento-cobro';


@Injectable({
  providedIn: 'root'
})
export class DocumentoCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DocumentoCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_DCMC}${wsGetById}`;
    return this.http.get<DocumentoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DocumentoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_DCMC}${wsGetById}${id}`;
    return this.http.get<DocumentoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<DocumentoCobro | null> {
    return this.http.post<DocumentoCobro>(ServiciosCxc.RS_DCMC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<DocumentoCobro | null> {
    return this.http.put<DocumentoCobro>(ServiciosCxc.RS_DCMC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DocumentoCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_DCMC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<DocumentoCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_DCMC}${wsEndpoint}`;
    return this.http.delete<DocumentoCobro>(url, this.httpOptions).pipe(
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
