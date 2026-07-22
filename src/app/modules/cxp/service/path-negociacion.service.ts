import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PathNegociacion } from '../model/path-negociacion';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class PathNegociacionService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getById(id: number): Observable<PathNegociacion | null> {
    return this.http.get<PathNegociacion>(`${ServiciosCxp.RS_PTNG}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByNegociacion(idNegociacion: number): Observable<PathNegociacion[] | null> {
    return this.http.get<PathNegociacion[]>(`${ServiciosCxp.RS_PTNG}/getByNegociacion/${idNegociacion}`).pipe(catchError(this.handleError));
  }

  selectByCriteria(criteria: any): Observable<PathNegociacion[] | null> {
    return this.http.post<PathNegociacion[]>(`${ServiciosCxp.RS_PTNG}/selectByCriteria/`, criteria, this.httpOptions).pipe(catchError(this.handleError));
  }

  add(item: Partial<PathNegociacion>): Observable<PathNegociacion | null> {
    return this.http.post<PathNegociacion>(`${ServiciosCxp.RS_PTNG}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(item: Partial<PathNegociacion>): Observable<PathNegociacion | null> {
    return this.http.put<PathNegociacion>(`${ServiciosCxp.RS_PTNG}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${ServiciosCxp.RS_PTNG}/delete/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
