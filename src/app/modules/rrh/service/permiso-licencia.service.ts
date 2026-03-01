import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PermisoLicencia } from '../model/permiso-licencia';
import { ServiciosRhh } from './ws-rrh';

/**
 * Servicio para gestión de Permisos y Licencias
 *
 * NOTA TEMPORAL: Actualmente usa el endpoint RS_PMLS que apunta a 'slct' (mismo que vacaciones)
 * hasta que el backend implemente el endpoint dedicado '/pmls'.
 *
 * Cuando el backend esté listo, cambiar en ws-rrh.ts:
 * public static RS_PMLS = `${API_URL}/pmls`;
 */
@Injectable({
  providedIn: 'root',
})
export class PermisoLicenciaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  // GET: obtener todas las solicitudes de permisos/licencias
  getAll(): Observable<PermisoLicencia[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosRhh.RS_PMLS}${wsGetAll}`;
    return this.http.get<PermisoLicencia[]>(url).pipe(catchError(this.handleError));
  }

  // GET: obtener solicitud por ID
  getById(id: string | number): Observable<PermisoLicencia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_PMLS}${wsGetById}${id}`;
    return this.http.get<PermisoLicencia>(url).pipe(catchError(this.handleError));
  }

  // POST: crear nueva solicitud
  add(datos: any): Observable<PermisoLicencia | null> {
    // Mapear PermisoLicencia a formato SolicitudVacaciones que espera el backend
    const payload = this.mapToBackendFormat(datos);
    return this.http
      .post<PermisoLicencia>(ServiciosRhh.RS_PMLS, payload, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // PUT: actualizar solicitud existente
  update(datos: any): Observable<PermisoLicencia | null> {
    // Mapear PermisoLicencia a formato SolicitudVacaciones que espera el backend
    const payload = this.mapToBackendFormat(datos);
    return this.http
      .put<PermisoLicencia>(ServiciosRhh.RS_PMLS, payload, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Mapea el modelo de PermisoLicencia al formato que espera el backend (SolicitudVacaciones)
   * Omite propiedades que el backend no reconoce (tipoPermiso, horaInicio, horaFin, etc.)
   */
  private mapToBackendFormat(datos: any): any {
    const mapped: any = {};

    // Campos básicos que coinciden
    if (datos.codigo !== undefined) mapped.codigo = datos.codigo;
    if (datos.empleado !== undefined) mapped.empleado = datos.empleado;
    if (datos.observacion !== undefined) mapped.observacion = datos.observacion;
    if (datos.estado !== undefined) mapped.estado = datos.estado;
    if (datos.usuarioAprobacion !== undefined) mapped.usuarioAprobacion = datos.usuarioAprobacion;
    if (datos.fechaAprobacion !== undefined) mapped.fechaAprobacion = datos.fechaAprobacion;
    if (datos.fechaRegistro !== undefined) mapped.fechaRegistro = datos.fechaRegistro;
    if (datos.usuarioRegistro !== undefined) mapped.usuarioRegistro = datos.usuarioRegistro;

    // Mapeo de nombres diferentes: fechaInicio -> fechaDesde, fechaFin -> fechaHasta
    if (datos.fechaInicio !== undefined) mapped.fechaDesde = datos.fechaInicio;
    if (datos.fechaFin !== undefined) mapped.fechaHasta = datos.fechaFin;

    // Mapeo de dias
    if (datos.dias !== undefined) mapped.diasSolicitados = datos.dias;

    // OMITIR: tipoPermiso, horaInicio, horaFin, horas, conGoce, numeroDocumento
    // Estas propiedades no existen en el backend y causarían error

    return mapped;
  }

  // POST: seleccionar por criterios - OBLIGATORIO usar este método para búsquedas
  selectByCriteria(datos: any): Observable<PermisoLicencia[] | null> {
    const wsCriteria = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_PMLS}${wsCriteria}`;
    return this.http.post<PermisoLicencia[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  // DELETE: eliminar por ID
  delete(id: any): Observable<PermisoLicencia | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosRhh.RS_PMLS}${wsDelete}`;
    return this.http
      .delete<PermisoLicencia>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // PUT: aprobar permiso/licencia
  aprobar(codigo: number, observacion?: string): Observable<PermisoLicencia | null> {
    const payload = {
      codigo,
      estado: 'APROBADA', // Backend usa strings, no números
      observacion: observacion || null,
      fechaAprobacion: new Date().toISOString(),
      usuarioAprobacion: this.getUsuarioRegistro(),
    };
    return this.update(payload);
  }

  // PUT: rechazar permiso/licencia
  rechazar(codigo: number, observacion: string): Observable<PermisoLicencia | null> {
    const payload = {
      codigo,
      estado: 'RECHAZADA', // Backend usa strings, no números
      observacion,
      fechaAprobacion: new Date().toISOString(),
      usuarioAprobacion: this.getUsuarioRegistro(),
    };
    return this.update(payload);
  }

  // PUT: cancelar permiso/licencia
  cancelar(codigo: number): Observable<PermisoLicencia | null> {
    const payload = {
      codigo,
      estado: 'ANULADA', // Backend usa strings, no números
      fechaAprobacion: new Date().toISOString(),
      usuarioAprobacion: this.getUsuarioRegistro(),
    };
    return this.update(payload);
  }

  private getUsuarioRegistro(): string {
    return localStorage.getItem('username') || 'sistema';
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
