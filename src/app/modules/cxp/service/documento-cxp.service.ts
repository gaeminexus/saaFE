import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DocumentoCxp } from '../model/documento-cxp';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class DocumentoCxpService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DocumentoCxp[] | null> {
    return this.http.get<DocumentoCxp[]>(`${ServiciosCxp.RS_DCXP}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<DocumentoCxp | null> {
    return this.http.get<DocumentoCxp>(`${ServiciosCxp.RS_DCXP}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByEmpresa(idEmpresa: number): Observable<DocumentoCxp[] | null> {
    return this.http.get<DocumentoCxp[]>(`${ServiciosCxp.RS_DCXP}/getByEmpresa/${idEmpresa}`).pipe(catchError(this.handleError));
  }

  getByEmpresaEstado(idEmpresa: number, estado: number): Observable<DocumentoCxp[] | null> {
    return this.http.get<DocumentoCxp[]>(`${ServiciosCxp.RS_DCXP}/getByEmpresaEstado/${idEmpresa}/${estado}`).pipe(catchError(this.handleError));
  }

  novedadesPendientes(idEmpresa: number): Observable<DocumentoCxp[] | null> {
    return this.http.get<DocumentoCxp[]>(`${ServiciosCxp.RS_DCXP}/novedadesPendientes/${idEmpresa}`).pipe(catchError(this.handleError));
  }

  add(item: DocumentoCxp): Observable<DocumentoCxp | null> {
    return this.http.post<DocumentoCxp>(`${ServiciosCxp.RS_DCXP}/add`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(item: DocumentoCxp): Observable<DocumentoCxp | null> {
    return this.http.put<DocumentoCxp>(`${ServiciosCxp.RS_DCXP}/update`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criteria: Partial<DocumentoCxp>): Observable<DocumentoCxp[] | null> {
    return this.http.post<DocumentoCxp[]>(`${ServiciosCxp.RS_DCXP}/selectByCriteria`, criteria, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${ServiciosCxp.RS_DCXP}/delete/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
