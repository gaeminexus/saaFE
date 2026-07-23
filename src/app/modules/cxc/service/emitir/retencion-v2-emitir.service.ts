import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { RetencionV2Emitir } from '../../model/retencion-v2-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class RetencionV2EmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<RetencionV2Emitir[] | null> {
    return this.http
      .get<RetencionV2Emitir[]>(`${ServiciosCxc.RS_RTV2}/getAll`)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<RetencionV2Emitir>): Observable<RetencionV2Emitir | null> {
    return this.http
      .post<RetencionV2Emitir>(ServiciosCxc.RS_RTV2, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  grabarRetencionV2(datos: Partial<RetencionV2Emitir>): Observable<RetencionV2Emitir | null> {
    return this.http
      .post<RetencionV2Emitir>(`${ServiciosCxc.RS_RTV2}/grabarRetencionV2`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<RetencionV2Emitir>): Observable<RetencionV2Emitir | null> {
    return this.http
      .put<RetencionV2Emitir>(ServiciosCxc.RS_RTV2, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<RetencionV2Emitir[] | null> {
    return this.http
      .post<RetencionV2Emitir[]>(`${ServiciosCxc.RS_RTV2}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<RetencionV2Emitir | null> {
    return this.http
      .delete<RetencionV2Emitir>(`${ServiciosCxc.RS_RTV2}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  reintentarAutorizacion(datos: { idRetencion: number }): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_RTV2}/reintentarAutorizacion`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  reenviarEmail(datos: { idRetencion: number; destinatarios: string }): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_RTV2}/reenviarEmail`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  anular(datos: { idRetencion: number; usuario: string; motivo: string }): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_RTV2}/anular`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
