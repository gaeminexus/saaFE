import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { PermisoLicencia } from '../model/permiso-licencia';
import { Peticiones } from '../model/peticiones';
import { ServiciosRhh } from './ws-rrh';

/**
 * Servicio de Permisos y Licencias.
 *
 * La tabla del backend es RHH.PTCN (`Peticiones`), expuesta en `/ptcn`. Antes este servicio
 * apuntaba a `/slct` (SolicitudVacaciones), que es la tabla de vacaciones y no tiene ni tipo
 * de permiso, ni horas, ni documento de respaldo.
 *
 * `mapToBackendFormat` / `mapFromBackendFormat` traducen entre el modelo de pantalla
 * (`PermisoLicencia`) y las columnas reales de PTCN.
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
    const url = `${ServiciosRhh.RS_PTCN}${wsGetAll}`;
    return this.http.get<Peticiones[]>(url).pipe(
      map((filas) => (filas ?? []).map((fila) => this.mapFromBackendFormat(fila))),
      catchError(this.handleError),
    );
  }

  // GET: obtener solicitud por ID
  getById(id: string | number): Observable<PermisoLicencia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_PTCN}${wsGetById}${id}`;
    return this.http.get<Peticiones>(url).pipe(
      map((fila) => (fila ? this.mapFromBackendFormat(fila) : null)),
      catchError(this.handleError),
    );
  }

  // POST: crear nueva solicitud
  add(datos: any): Observable<PermisoLicencia | null> {
    const payload = this.mapToBackendFormat(datos);
    return this.http
      .post<PermisoLicencia>(ServiciosRhh.RS_PTCN, payload, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // PUT: actualizar solicitud existente
  update(datos: any): Observable<PermisoLicencia | null> {
    const payload = this.mapToBackendFormat(datos);
    return this.http
      .put<PermisoLicencia>(ServiciosRhh.RS_PTCN, payload, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // POST: seleccionar por criterios - OBLIGATORIO usar este método para búsquedas
  selectByCriteria(datos: any): Observable<PermisoLicencia[] | null> {
    const wsCriteria = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_PTCN}${wsCriteria}`;
    return this.http.post<Peticiones[]>(url, datos, this.httpOptions).pipe(
      map((filas) => (filas ?? []).map((fila) => this.mapFromBackendFormat(fila))),
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas.
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
    const url = `${ServiciosRhh.RS_PTCN}${wsDelete}`;
    return this.http
      .delete<PermisoLicencia>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // PUT: aprobar permiso/licencia
  aprobar(codigo: number, observacion?: string): Observable<PermisoLicencia | null> {
    return this.cambiarEstado(codigo, 'APROBADA', observacion ?? null);
  }

  // PUT: rechazar permiso/licencia
  rechazar(codigo: number, observacion: string): Observable<PermisoLicencia | null> {
    return this.cambiarEstado(codigo, 'RECHAZADA', observacion);
  }

  // PUT: cancelar permiso/licencia
  cancelar(codigo: number): Observable<PermisoLicencia | null> {
    return this.cambiarEstado(codigo, 'ANULADA', null);
  }

  private cambiarEstado(
    codigo: number,
    estado: string,
    observacion: string | null,
  ): Observable<PermisoLicencia | null> {
    const payload: any = {
      codigo,
      estado,
      usuarioAprobador: usuarioSesion(),
    };
    if (observacion !== null) {
      payload.observacion = observacion;
    }
    return this.http
      .put<PermisoLicencia>(ServiciosRhh.RS_PTCN, payload, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Traduce el modelo de pantalla a las columnas de RHH.PTCN.
   * PTCN no tiene columna para `horaInicio`, `horaFin`, `dias` ni `conGoce`: los días se
   * derivan de fechaDesde/fechaHasta y el goce de sueldo es un atributo del tipo (RHH.CTLG).
   */
  private mapToBackendFormat(datos: any): any {
    const mapped: any = {};

    if (datos.codigo !== undefined) mapped.codigo = datos.codigo;
    if (datos.empleado !== undefined) mapped.empleado = datos.empleado;
    if (datos.tipoPermiso !== undefined) mapped.catalogo = datos.tipoPermiso;
    if (datos.fechaInicio !== undefined) mapped.fechaDesde = datos.fechaInicio;
    if (datos.fechaFin !== undefined) mapped.fechaHasta = datos.fechaFin;
    if (datos.horas !== undefined) mapped.horas = datos.horas;
    if (datos.motivo !== undefined) mapped.motivo = datos.motivo;
    if (datos.numeroDocumento !== undefined) mapped.documento = datos.numeroDocumento;
    if (datos.observacion !== undefined) mapped.observacion = datos.observacion;
    if (datos.estado !== undefined) mapped.estado = datos.estado;
    if (datos.usuarioAprobacion !== undefined) mapped.usuarioAprobador = datos.usuarioAprobacion;
    if (datos.fechaRegistro !== undefined) mapped.fechaRegistro = datos.fechaRegistro;
    if (datos.usuarioRegistro !== undefined) mapped.usuarioRegistro = datos.usuarioRegistro;

    return mapped;
  }

  /** Traduce una fila de RHH.PTCN al modelo de pantalla. */
  private mapFromBackendFormat(fila: any): PermisoLicencia {
    return {
      codigo: fila.codigo,
      empleado: fila.empleado,
      tipoPermiso: fila.catalogo,
      fechaInicio: fila.fechaDesde,
      fechaFin: fila.fechaHasta,
      horaInicio: null,
      horaFin: null,
      dias: null,
      horas: fila.horas ?? null,
      conGoce: fila.catalogo?.conGoce === 'S',
      numeroDocumento: fila.documento ?? null,
      motivo: fila.motivo ?? null,
      observacion: fila.observacion ?? null,
      estado: fila.estado,
      fechaAprobacion: null,
      usuarioAprobacion: fila.usuarioAprobador ?? null,
      fechaRegistro: fila.fechaRegistro,
      usuarioRegistro: fila.usuarioRegistro,
    };
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
