import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Empleado } from '../model/empleado';
import { ServiciosRrh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class EmpleadoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los empleados.
   */
  getAll(): Observable<Empleado[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosRrh.RS_EMPL}${wsGetAll}`;
    return this.http.get<Empleado[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un empleado por su ID.
   */
  getById(id: string | number): Observable<Empleado | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRrh.RS_EMPL}${wsGetById}${id}`;
    return this.http.get<Empleado>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea un nuevo empleado.
   */
  add(datos: any): Observable<Empleado | null> {
    return this.http
      .post<Empleado>(ServiciosRrh.RS_EMPL, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza un empleado existente.
   */
  update(datos: any): Observable<Empleado | null> {
    return this.http
      .put<Empleado>(ServiciosRrh.RS_EMPL, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Selecciona empleados según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Empleado[] | null> {
    const wsCriteria = '/criteria';
    const url = `${ServiciosRrh.RS_EMPL}${wsCriteria}`;
    return this.http
      .post<Empleado[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina un empleado por su ID.
   */
  delete(id: any): Observable<Empleado | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosRrh.RS_EMPL}${wsDelete}`;
    return this.http.delete<Empleado>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * Manejo de errores HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
