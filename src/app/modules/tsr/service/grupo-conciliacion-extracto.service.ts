import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { GrupoConciliacionExtracto } from '../model/grupo-conciliacion-extracto';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class GrupoConciliacionExtractoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: DatosBusqueda[]): Observable<GrupoConciliacionExtracto[]> {
    const url = `${ServiciosTsr.RS_GCEX}/selectByCriteria`;
    return this.http
      .post<GrupoConciliacionExtracto[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error.error || error);
  }
}
