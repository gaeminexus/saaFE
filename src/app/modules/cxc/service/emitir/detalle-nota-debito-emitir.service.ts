import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleNotaDebitoEmitir } from '../../model/detalle-nota-debito-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class DetalleNotaDebitoEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: any): Observable<DetalleNotaDebitoEmitir[] | null> {
    return this.http
      .post<DetalleNotaDebitoEmitir[]>(`${ServiciosCxc.RS_DTND}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleNotaDebitoEmitir>): Observable<DetalleNotaDebitoEmitir | null> {
    return this.http
      .post<DetalleNotaDebitoEmitir>(ServiciosCxc.RS_DTND, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleNotaDebitoEmitir>): Observable<DetalleNotaDebitoEmitir | null> {
    return this.http
      .put<DetalleNotaDebitoEmitir>(ServiciosCxc.RS_DTND, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleNotaDebitoEmitir | null> {
    return this.http
      .delete<DetalleNotaDebitoEmitir>(`${ServiciosCxc.RS_DTND}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
