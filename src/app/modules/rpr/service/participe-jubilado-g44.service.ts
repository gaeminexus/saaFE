import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { ParticipeJubiladoG44 } from '../model/participe-jubilado-g44';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class ParticipeJubiladoG44Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParticipeJubiladoG44[] | null> {
    const url = `${ServiciosRpr.RS_CG44}/getAll`;
    return this.http.get<ParticipeJubiladoG44[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<ParticipeJubiladoG44 | null> {
    const url = `${ServiciosRpr.RS_CG44}/getId/${id}`;
    return this.http.get<ParticipeJubiladoG44>(url).pipe(catchError(this.handleError));
  }

  add(datos: ParticipeJubiladoG44): Observable<ParticipeJubiladoG44 | null> {
    return this.http
      .post<ParticipeJubiladoG44>(ServiciosRpr.RS_CG44, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: ParticipeJubiladoG44): Observable<ParticipeJubiladoG44 | null> {
    return this.http
      .put<ParticipeJubiladoG44>(ServiciosRpr.RS_CG44, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<ParticipeJubiladoG44 | null> {
    const url = `${ServiciosRpr.RS_CG44}/${id}`;
    return this.http.delete<ParticipeJubiladoG44>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<ParticipeJubiladoG44[] | null> {
    const url = `${ServiciosRpr.RS_CG44}/selectByCriteria`;
    return this.http
      .post<ParticipeJubiladoG44[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
