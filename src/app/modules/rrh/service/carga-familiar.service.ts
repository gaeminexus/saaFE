import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { CargaFamiliar } from '../model/carga-familiar';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.CRGF. */
@Injectable({
  providedIn: 'root',
})
export class CargaFamiliarService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CargaFamiliar[] | null> {
    const url = `${ServiciosRhh.RS_CRGF}/getAll`;
    return this.http.get<CargaFamiliar[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<CargaFamiliar | null> {
    const url = `${ServiciosRhh.RS_CRGF}/getId/${id}`;
    return this.http.get<CargaFamiliar>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<CargaFamiliar | null> {
    return this.http
      .post<CargaFamiliar>(ServiciosRhh.RS_CRGF, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<CargaFamiliar | null> {
    return this.http
      .put<CargaFamiliar>(ServiciosRhh.RS_CRGF, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<CargaFamiliar[] | null> {
    const url = `${ServiciosRhh.RS_CRGF}/selectByCriteria/`;
    return this.http.post<CargaFamiliar[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<CargaFamiliar | null> {
    const url = `${ServiciosRhh.RS_CRGF}/${id}`;
    return this.http.delete<CargaFamiliar>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  // Manejo de errores HTTP (respetando patrón de of(null) con status 200)
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
