import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DocumentoCredito } from '../model/documento-credito';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class DocumentoCreditoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DocumentoCredito[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_DCMN}${wsGetById}`;
    return this.http.get<DocumentoCredito[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DocumentoCredito | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_DCMN}${wsGetById}${id}`;
    return this.http.get<DocumentoCredito>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<DocumentoCredito | null> {
    return this.http.post<DocumentoCredito>(ServiciosCrd.RS_DCMN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<DocumentoCredito | null> {
    return this.http.put<DocumentoCredito>(ServiciosCrd.RS_DCMN, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DocumentoCredito[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_DCMN}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<DocumentoCredito | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_DCMN}${wsEndpoint}`;
    return this.http.delete<DocumentoCredito>(url, this.httpOptions).pipe(
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
