import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { AdendumNegociacion } from '../model/adendum-negociacion';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class AdendumNegociacionService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getById(id: number): Observable<AdendumNegociacion | null> {
    return this.http.get<AdendumNegociacion>(`${ServiciosCxp.RS_ADNG}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByNegociacion(idNegociacion: number): Observable<AdendumNegociacion[] | null> {
    return this.http.get<AdendumNegociacion[]>(`${ServiciosCxp.RS_ADNG}/getByNegociacion/${idNegociacion}`).pipe(catchError(this.handleError));
  }

  selectByCriteria(criteria: any): Observable<AdendumNegociacion[] | null> {
    return this.http.post<AdendumNegociacion[]>(`${ServiciosCxp.RS_ADNG}/selectByCriteria`, criteria, this.httpOptions).pipe(catchError(this.handleError));
  }

  add(item: Partial<AdendumNegociacion>): Observable<AdendumNegociacion | null> {
    return this.http.post<AdendumNegociacion>(`${ServiciosCxp.RS_ADNG}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(item: Partial<AdendumNegociacion>): Observable<AdendumNegociacion | null> {
    return this.http.put<AdendumNegociacion>(`${ServiciosCxp.RS_ADNG}`, item, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${ServiciosCxp.RS_ADNG}/delete/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
