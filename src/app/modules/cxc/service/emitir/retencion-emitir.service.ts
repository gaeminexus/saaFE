import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { RetencionEmitir } from '../../model/retencion-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class RetencionEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<RetencionEmitir[] | null> {
    return this.http
      .get<RetencionEmitir[]>(`${ServiciosCxc.RS_RTNC}/getAll`)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<RetencionEmitir>): Observable<RetencionEmitir | null> {
    return this.http
      .post<RetencionEmitir>(ServiciosCxc.RS_RTNC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  grabarRetencion(datos: Partial<RetencionEmitir>): Observable<RetencionEmitir | null> {
    return this.http
      .post<RetencionEmitir>(`${ServiciosCxc.RS_RTNC}/grabarRetencion`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<RetencionEmitir>): Observable<RetencionEmitir | null> {
    return this.http
      .put<RetencionEmitir>(ServiciosCxc.RS_RTNC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<RetencionEmitir[] | null> {
    return this.http
      .post<RetencionEmitir[]>(`${ServiciosCxc.RS_RTNC}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<RetencionEmitir | null> {
    return this.http
      .delete<RetencionEmitir>(`${ServiciosCxc.RS_RTNC}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
