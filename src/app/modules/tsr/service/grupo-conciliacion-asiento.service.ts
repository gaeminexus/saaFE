import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { GrupoConciliacionAsiento } from '../model/grupo-conciliacion-asiento';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class GrupoConciliacionAsientoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: DatosBusqueda[]): Observable<GrupoConciliacionAsiento[]> {
    const url = `${ServiciosTsr.RS_GCAS}/selectByCriteria`;
    return this.http
      .post<GrupoConciliacionAsiento[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error.error || error);
  }
}
