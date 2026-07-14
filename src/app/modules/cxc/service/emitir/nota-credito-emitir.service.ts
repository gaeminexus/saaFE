import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { NotaCreditoEmitir } from '../../model/nota-credito-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class NotaCreditoEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NotaCreditoEmitir[] | null> {
    return this.http
      .get<NotaCreditoEmitir[]>(`${ServiciosCxc.RS_NTCR}/getAll`)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<NotaCreditoEmitir>): Observable<NotaCreditoEmitir | null> {
    return this.http
      .post<NotaCreditoEmitir>(ServiciosCxc.RS_NTCR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  grabarNotaCredito(datos: Partial<NotaCreditoEmitir>): Observable<NotaCreditoEmitir | null> {
    return this.http
      .post<NotaCreditoEmitir>(`${ServiciosCxc.RS_NTCR}/grabarNotaCredito`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<NotaCreditoEmitir>): Observable<NotaCreditoEmitir | null> {
    return this.http
      .put<NotaCreditoEmitir>(ServiciosCxc.RS_NTCR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<NotaCreditoEmitir[] | null> {
    return this.http
      .post<NotaCreditoEmitir[]>(`${ServiciosCxc.RS_NTCR}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<NotaCreditoEmitir | null> {
    return this.http
      .delete<NotaCreditoEmitir>(`${ServiciosCxc.RS_NTCR}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
