import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { CuentaBancariaEmpleado } from '../model/cuenta-bancaria-empleado';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.CBEM. */
@Injectable({
  providedIn: 'root',
})
export class CuentaBancariaEmpleadoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CuentaBancariaEmpleado[] | null> {
    const url = `${ServiciosRhh.RS_CBEM}/getAll`;
    return this.http.get<CuentaBancariaEmpleado[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<CuentaBancariaEmpleado | null> {
    const url = `${ServiciosRhh.RS_CBEM}/getId/${id}`;
    return this.http.get<CuentaBancariaEmpleado>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<CuentaBancariaEmpleado | null> {
    return this.http
      .post<CuentaBancariaEmpleado>(ServiciosRhh.RS_CBEM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<CuentaBancariaEmpleado | null> {
    return this.http
      .put<CuentaBancariaEmpleado>(ServiciosRhh.RS_CBEM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<CuentaBancariaEmpleado[] | null> {
    const url = `${ServiciosRhh.RS_CBEM}/selectByCriteria/`;
    return this.http.post<CuentaBancariaEmpleado[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<CuentaBancariaEmpleado | null> {
    const url = `${ServiciosRhh.RS_CBEM}/${id}`;
    return this.http.delete<CuentaBancariaEmpleado>(url, this.httpOptions).pipe(catchError(this.handleError));
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
