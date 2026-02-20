import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PermisoLicencia } from '../model/permiso-licencia';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class PermisoLicenciaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  // GET: obtener todos los permisos
  getAll(): Observable<PermisoLicencia[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosRhh.RS_PMLS}${wsGetAll}`;
    return this.http.get<PermisoLicencia[]>(url).pipe(catchError(this.handleError));
  }

  // GET: obtener permiso por ID
  getById(id: string | number): Observable<PermisoLicencia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_PMLS}${wsGetById}${id}`;
    return this.http.get<PermisoLicencia>(url).pipe(catchError(this.handleError));
  }

  // POST: crear nuevo permiso
  add(datos: any): Observable<PermisoLicencia | null> {
    return this.http
      .post<PermisoLicencia>(ServiciosRhh.RS_PMLS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // PUT: actualizar permiso existente
  update(datos: any): Observable<PermisoLicencia | null> {
    return this.http
      .put<PermisoLicencia>(ServiciosRhh.RS_PMLS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // POST: seleccionar por criterios - OBLIGATORIO usar este método para búsquedas
  selectByCriteria(datos: any): Observable<PermisoLicencia[] | null> {
    const wsCriteria = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_PMLS}${wsCriteria}`;
    return this.http
      .post<PermisoLicencia[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // POST: aprobar permiso
  aprobar(codigo: number, observacion?: string): Observable<PermisoLicencia | null> {
    const wsAprobar = '/aprobar';
    const url = `${ServiciosRhh.RS_PMLS}${wsAprobar}`;
    const datos = { codigo, observacion: observacion || '' };
    return this.http
      .post<PermisoLicencia>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // POST: rechazar permiso
  rechazar(codigo: number, observacion: string): Observable<PermisoLicencia | null> {
    const wsRechazar = '/rechazar';
    const url = `${ServiciosRhh.RS_PMLS}${wsRechazar}`;
    const datos = { codigo, observacion };
    return this.http
      .post<PermisoLicencia>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // POST: cancelar permiso
  cancelar(codigo: number): Observable<PermisoLicencia | null> {
    const wsCancelar = '/cancelar';
    const url = `${ServiciosRhh.RS_PMLS}${wsCancelar}`;
    const datos = { codigo };
    return this.http
      .post<PermisoLicencia>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // POST: validar solapamientos
  validarSolapamientos(datos: any): Observable<any | null> {
    const wsValidar = '/validarSolapamientos';
    const url = `${ServiciosRhh.RS_PMLS}${wsValidar}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  // DELETE: eliminar por ID (no recomendado - usar cancelar en su lugar)
  delete(id: any): Observable<PermisoLicencia | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosRhh.RS_PMLS}${wsDelete}`;
    return this.http
      .delete<PermisoLicencia>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
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
