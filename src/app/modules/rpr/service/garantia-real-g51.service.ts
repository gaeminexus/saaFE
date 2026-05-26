import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { GarantiaRealG51 } from '../model/garantia-real-g51';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class GarantiaRealG51Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<GarantiaRealG51[] | null> {
    const url = `${ServiciosRpr.RS_CG51}/getAll`;
    return this.http.get<GarantiaRealG51[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<GarantiaRealG51 | null> {
    const url = `${ServiciosRpr.RS_CG51}/getId/${id}`;
    return this.http.get<GarantiaRealG51>(url).pipe(catchError(this.handleError));
  }

  add(datos: GarantiaRealG51): Observable<GarantiaRealG51 | null> {
    return this.http
      .post<GarantiaRealG51>(ServiciosRpr.RS_CG51, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: GarantiaRealG51): Observable<GarantiaRealG51 | null> {
    return this.http
      .put<GarantiaRealG51>(ServiciosRpr.RS_CG51, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<GarantiaRealG51 | null> {
    const url = `${ServiciosRpr.RS_CG51}/${id}`;
    return this.http.delete<GarantiaRealG51>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<GarantiaRealG51[] | null> {
    const url = `${ServiciosRpr.RS_CG51}/selectByCriteria`;
    return this.http
      .post<GarantiaRealG51[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
