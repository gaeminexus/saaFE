import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Empleado } from '../model/empleado';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class EmpleadoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  // GET: obtener todos los empleados
  getAll(): Observable<Empleado[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosRhh.RS_MPLD}${wsGetAll}`;
    return this.http.get<Empleado[]>(url).pipe(catchError(this.handleError));
  }

  // GET: obtener empleado por ID
  getById(id: string | number): Observable<Empleado | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_MPLD}${wsGetById}${id}`;
    return this.http.get<Empleado>(url).pipe(catchError(this.handleError));
  }

  // POST: crear nuevo empleado
  add(datos: any): Observable<Empleado | null> {
    return this.http
      .post<Empleado>(ServiciosRhh.RS_MPLD, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // PUT: actualizar empleado existente
  update(datos: any): Observable<Empleado | null> {
    return this.http
      .put<Empleado>(ServiciosRhh.RS_MPLD, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // POST: seleccionar por criterios
  selectByCriteria(datos: any): Observable<Empleado[] | null> {
    const wsCriteria = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_MPLD}${wsCriteria}`;
    return this.http
      .post<Empleado[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // DELETE: eliminar por ID
  delete(id: any): Observable<Empleado | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosRhh.RS_MPLD}${wsDelete}`;
    return this.http.delete<Empleado>(url, this.httpOptions).pipe(catchError(this.handleError));
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
