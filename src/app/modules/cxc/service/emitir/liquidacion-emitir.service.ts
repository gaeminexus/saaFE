import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { LiquidacionEmitir } from '../../model/liquidacion-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class LiquidacionEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<LiquidacionEmitir[] | null> {
    return this.http
      .get<LiquidacionEmitir[]>(`${ServiciosCxc.RS_LQCS}/getAll`)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<LiquidacionEmitir>): Observable<LiquidacionEmitir | null> {
    return this.http
      .post<LiquidacionEmitir>(ServiciosCxc.RS_LQCS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  grabarLiquidacion(datos: Partial<LiquidacionEmitir>): Observable<LiquidacionEmitir | null> {
    return this.http
      .post<LiquidacionEmitir>(`${ServiciosCxc.RS_LQCS}/grabarLiquidacion`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<LiquidacionEmitir>): Observable<LiquidacionEmitir | null> {
    return this.http
      .put<LiquidacionEmitir>(ServiciosCxc.RS_LQCS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<LiquidacionEmitir[] | null> {
    return this.http
      .post<LiquidacionEmitir[]>(`${ServiciosCxc.RS_LQCS}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<LiquidacionEmitir | null> {
    return this.http
      .delete<LiquidacionEmitir>(`${ServiciosCxc.RS_LQCS}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
