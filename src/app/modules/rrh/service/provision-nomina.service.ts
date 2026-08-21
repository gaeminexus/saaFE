import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { ProvisionNomina } from '../model/provision-nomina';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.PVNM. */
@Injectable({
  providedIn: 'root',
})
export class ProvisionNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ProvisionNomina[] | null> {
    const url = `${ServiciosRhh.RS_PVNM}/getAll`;
    return this.http.get<ProvisionNomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<ProvisionNomina | null> {
    const url = `${ServiciosRhh.RS_PVNM}/getId/${id}`;
    return this.http.get<ProvisionNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<ProvisionNomina | null> {
    return this.http
      .post<ProvisionNomina>(ServiciosRhh.RS_PVNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<ProvisionNomina | null> {
    return this.http
      .put<ProvisionNomina>(ServiciosRhh.RS_PVNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<ProvisionNomina[] | null> {
    const url = `${ServiciosRhh.RS_PVNM}/selectByCriteria/`;
    return this.http.post<ProvisionNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<ProvisionNomina | null> {
    const url = `${ServiciosRhh.RS_PVNM}/${id}`;
    return this.http.delete<ProvisionNomina>(url, this.httpOptions).pipe(catchError(this.handleError));
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
