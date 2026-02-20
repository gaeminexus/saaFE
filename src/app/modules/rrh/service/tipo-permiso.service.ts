import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoPermiso } from '../model/permiso-licencia';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class TipoPermisoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  // GET: obtener todos los tipos de permiso
  getAll(): Observable<TipoPermiso[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosRhh.RS_TPPR}${wsGetAll}`;
    return this.http.get<TipoPermiso[]>(url).pipe(catchError(this.handleError));
  }

  // GET: obtener tipo permiso por ID
  getById(id: string | number): Observable<TipoPermiso | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_TPPR}${wsGetById}${id}`;
    return this.http.get<TipoPermiso>(url).pipe(catchError(this.handleError));
  }

  // POST: crear nuevo tipo permiso
  add(datos: any): Observable<TipoPermiso | null> {
    return this.http
      .post<TipoPermiso>(ServiciosRhh.RS_TPPR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // PUT: actualizar tipo permiso
  update(datos: any): Observable<TipoPermiso | null> {
    return this.http
      .put<TipoPermiso>(ServiciosRhh.RS_TPPR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // POST: seleccionar por criterios - OBLIGATORIO usar este método para búsquedas
  selectByCriteria(datos: any): Observable<TipoPermiso[] | null> {
    const wsCriteria = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_TPPR}${wsCriteria}`;
    return this.http
      .post<TipoPermiso[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // DELETE: eliminar por ID
  delete(id: any): Observable<TipoPermiso | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosRhh.RS_TPPR}${wsDelete}`;
    return this.http.delete<TipoPermiso>(url, this.httpOptions).pipe(catchError(this.handleError));
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
