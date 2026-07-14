import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleLiquidacionEmitir } from '../../model/detalle-liquidacion-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class DetalleLiquidacionEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: any): Observable<DetalleLiquidacionEmitir[] | null> {
    return this.http
      .post<DetalleLiquidacionEmitir[]>(`${ServiciosCxc.RS_DTLC}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<DetalleLiquidacionEmitir>): Observable<DetalleLiquidacionEmitir | null> {
    return this.http
      .post<DetalleLiquidacionEmitir>(ServiciosCxc.RS_DTLC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<DetalleLiquidacionEmitir>): Observable<DetalleLiquidacionEmitir | null> {
    return this.http
      .put<DetalleLiquidacionEmitir>(ServiciosCxc.RS_DTLC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<DetalleLiquidacionEmitir | null> {
    return this.http
      .delete<DetalleLiquidacionEmitir>(`${ServiciosCxc.RS_DTLC}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
