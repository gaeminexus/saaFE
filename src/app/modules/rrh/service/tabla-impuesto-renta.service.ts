import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { TablaImpuestoRenta } from '../model/tabla-impuesto-renta';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.TBIR. */
@Injectable({
  providedIn: 'root',
})
export class TablaImpuestoRentaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<TablaImpuestoRenta[] | null> {
    const url = `${ServiciosRhh.RS_TBIR}/getAll`;
    return this.http.get<TablaImpuestoRenta[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<TablaImpuestoRenta | null> {
    const url = `${ServiciosRhh.RS_TBIR}/getId/${id}`;
    return this.http.get<TablaImpuestoRenta>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<TablaImpuestoRenta | null> {
    return this.http
      .post<TablaImpuestoRenta>(ServiciosRhh.RS_TBIR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<TablaImpuestoRenta | null> {
    return this.http
      .put<TablaImpuestoRenta>(ServiciosRhh.RS_TBIR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<TablaImpuestoRenta[] | null> {
    const url = `${ServiciosRhh.RS_TBIR}/selectByCriteria/`;
    return this.http.post<TablaImpuestoRenta[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<TablaImpuestoRenta | null> {
    const url = `${ServiciosRhh.RS_TBIR}/${id}`;
    return this.http.delete<TablaImpuestoRenta>(url, this.httpOptions).pipe(catchError(this.handleError));
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
