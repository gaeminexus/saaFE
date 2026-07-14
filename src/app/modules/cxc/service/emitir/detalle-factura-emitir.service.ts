import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleFacturaEmitir } from '../../model/detalle-factura-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class DetalleFacturaEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: any): Observable<DetalleFacturaEmitir[] | null> {
    return this.http
      .post<DetalleFacturaEmitir[]>(`${ServiciosCxc.RS_DTFC}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleFacturaEmitir>): Observable<DetalleFacturaEmitir | null> {
    return this.http
      .post<DetalleFacturaEmitir>(ServiciosCxc.RS_DTFC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleFacturaEmitir>): Observable<DetalleFacturaEmitir | null> {
    return this.http
      .put<DetalleFacturaEmitir>(ServiciosCxc.RS_DTFC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleFacturaEmitir | null> {
    return this.http
      .delete<DetalleFacturaEmitir>(`${ServiciosCxc.RS_DTFC}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
