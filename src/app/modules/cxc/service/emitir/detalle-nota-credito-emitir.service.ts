import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleNotaCreditoEmitir } from '../../model/detalle-nota-credito-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class DetalleNotaCreditoEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: any): Observable<DetalleNotaCreditoEmitir[] | null> {
    return this.http
      .post<DetalleNotaCreditoEmitir[]>(`${ServiciosCxc.RS_DTNC}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleNotaCreditoEmitir>): Observable<DetalleNotaCreditoEmitir | null> {
    return this.http
      .post<DetalleNotaCreditoEmitir>(ServiciosCxc.RS_DTNC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleNotaCreditoEmitir>): Observable<DetalleNotaCreditoEmitir | null> {
    return this.http
      .put<DetalleNotaCreditoEmitir>(ServiciosCxc.RS_DTNC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleNotaCreditoEmitir | null> {
    return this.http
      .delete<DetalleNotaCreditoEmitir>(`${ServiciosCxc.RS_DTNC}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
