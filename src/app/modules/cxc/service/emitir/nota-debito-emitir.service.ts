import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { NotaDebitoEmitir } from '../../model/nota-debito-emitir';
import { ServiciosCxc } from '../ws-cxc';

@Injectable({ providedIn: 'root' })
export class NotaDebitoEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NotaDebitoEmitir[] | null> {
    return this.http
      .get<NotaDebitoEmitir[]>(`${ServiciosCxc.RS_NTDB}/getAll`)
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<NotaDebitoEmitir | null> {
    return this.http
      .get<NotaDebitoEmitir>(`${ServiciosCxc.RS_NTDB}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<NotaDebitoEmitir>): Observable<NotaDebitoEmitir | null> {
    return this.http
      .post<NotaDebitoEmitir>(ServiciosCxc.RS_NTDB, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  grabarNotaDebito(datos: Partial<NotaDebitoEmitir>): Observable<NotaDebitoEmitir | null> {
    return this.http
      .post<NotaDebitoEmitir>(`${ServiciosCxc.RS_NTDB}/grabarNotaDebito`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  procesarCompleta(datos: any): Observable<NotaDebitoEmitir | null> {
    return this.http
      .post<NotaDebitoEmitir>(`${ServiciosCxc.RS_NTDB}/procesarCompleta`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<NotaDebitoEmitir>): Observable<NotaDebitoEmitir | null> {
    return this.http
      .put<NotaDebitoEmitir>(ServiciosCxc.RS_NTDB, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<NotaDebitoEmitir[] | null> {
    return this.http
      .post<NotaDebitoEmitir[]>(`${ServiciosCxc.RS_NTDB}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<NotaDebitoEmitir | null> {
    return this.http
      .delete<NotaDebitoEmitir>(`${ServiciosCxc.RS_NTDB}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  reintentarAutorizacion(datos: { idNotaDebito: number }): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_NTDB}/reintentarAutorizacion`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  reenviarEmail(datos: { idNotaDebito: number; destinatarios: string }): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_NTDB}/reenviarEmail`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  anular(datos: { idNotaDebito: number; usuario: string; motivo: string }): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_NTDB}/anular`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
