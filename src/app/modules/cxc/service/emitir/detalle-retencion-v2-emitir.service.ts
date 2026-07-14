import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleRetencionV2Emitir } from '../../model/detalle-retencion-v2-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class DetalleRetencionV2EmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: any): Observable<DetalleRetencionV2Emitir[] | null> {
    return this.http
      .post<DetalleRetencionV2Emitir[]>(`${ServiciosCxc.RS_DRV2}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleRetencionV2Emitir>): Observable<DetalleRetencionV2Emitir | null> {
    return this.http
      .post<DetalleRetencionV2Emitir>(ServiciosCxc.RS_DRV2, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleRetencionV2Emitir>): Observable<DetalleRetencionV2Emitir | null> {
    return this.http
      .put<DetalleRetencionV2Emitir>(ServiciosCxc.RS_DRV2, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleRetencionV2Emitir | null> {
    return this.http
      .delete<DetalleRetencionV2Emitir>(`${ServiciosCxc.RS_DRV2}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
