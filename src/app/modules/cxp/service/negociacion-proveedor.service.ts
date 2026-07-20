import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { NegociacionProveedor } from '../model/negociacion-proveedor';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class NegociacionProveedorService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NegociacionProveedor[] | null> {
    return this.http.get<NegociacionProveedor[]>(`${ServiciosCxp.RS_NGCP}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<NegociacionProveedor | null> {
    return this.http.get<NegociacionProveedor>(`${ServiciosCxp.RS_NGCP}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByEmpresa(idEmpresa: number): Observable<NegociacionProveedor[] | null> {
    return this.http.get<NegociacionProveedor[]>(`${ServiciosCxp.RS_NGCP}/getByEmpresa/${idEmpresa}`).pipe(catchError(this.handleError));
  }

  selectByCriteria(criteria: any): Observable<NegociacionProveedor[] | null> {
    return this.http.post<NegociacionProveedor[]>(`${ServiciosCxp.RS_NGCP}/selectByCriteria`, criteria, this.httpOptions).pipe(catchError(this.handleError));
  }

  add(item: Partial<NegociacionProveedor>): Observable<NegociacionProveedor | null> {
    return this.http.post<NegociacionProveedor>(`${ServiciosCxp.RS_NGCP}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(item: Partial<NegociacionProveedor>): Observable<NegociacionProveedor | null> {
    return this.http.put<NegociacionProveedor>(`${ServiciosCxp.RS_NGCP}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${ServiciosCxp.RS_NGCP}/delete/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
