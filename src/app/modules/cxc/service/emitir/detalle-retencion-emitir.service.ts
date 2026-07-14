import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleRetencionEmitir } from '../../model/detalle-retencion-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class DetalleRetencionEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: any): Observable<DetalleRetencionEmitir[] | null> {
    return this.http
      .post<DetalleRetencionEmitir[]>(`${ServiciosCxc.RS_DTRT}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleRetencionEmitir>): Observable<DetalleRetencionEmitir | null> {
    return this.http
      .post<DetalleRetencionEmitir>(ServiciosCxc.RS_DTRT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleRetencionEmitir>): Observable<DetalleRetencionEmitir | null> {
    return this.http
      .put<DetalleRetencionEmitir>(ServiciosCxc.RS_DTRT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleRetencionEmitir | null> {
    return this.http
      .delete<DetalleRetencionEmitir>(`${ServiciosCxc.RS_DTRT}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
