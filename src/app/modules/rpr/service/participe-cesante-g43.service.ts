import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { ParticipeCesanteG43 } from '../model/participe-cesante-g43';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class ParticipeCesanteG43Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParticipeCesanteG43[] | null> {
    const url = `${ServiciosRpr.RS_CG43}/getAll`;
    return this.http.get<ParticipeCesanteG43[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<ParticipeCesanteG43 | null> {
    const url = `${ServiciosRpr.RS_CG43}/getId/${id}`;
    return this.http.get<ParticipeCesanteG43>(url).pipe(catchError(this.handleError));
  }

  add(datos: ParticipeCesanteG43): Observable<ParticipeCesanteG43 | null> {
    return this.http
      .post<ParticipeCesanteG43>(ServiciosRpr.RS_CG43, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: ParticipeCesanteG43): Observable<ParticipeCesanteG43 | null> {
    return this.http
      .put<ParticipeCesanteG43>(ServiciosRpr.RS_CG43, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<ParticipeCesanteG43 | null> {
    const url = `${ServiciosRpr.RS_CG43}/${id}`;
    return this.http.delete<ParticipeCesanteG43>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<ParticipeCesanteG43[] | null> {
    const url = `${ServiciosRpr.RS_CG43}/selectByCriteria`;
    return this.http
      .post<ParticipeCesanteG43[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
