import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { Asistencia } from '../model/asistencia';
import { ServiciosRhh } from './ws-rrh';

/**
 * Servicio para gestión de A sistencia/Marcaciones
 * Usa el endpoint RS_MRCC (marcaciones) del backend
 */
@Injectable({
  providedIn: 'root',
})
export class AsistenciaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  // GET: obtener todos los registros
  getAll(): Observable<Asistencia[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosRhh.RS_MRCC}${wsGetAll}`;
    console.log('🔍 Consultando asistencias desde backend:', url);
    return this.http.get<Asistencia[]>(url).pipe(
      catchError(this.handleError),
      map((rows) => this.mapFromBackendArray(rows)),
    );
  }

  // GET: obtener por ID
  getById(id: string | number): Observable<Asistencia | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_MRCC}${wsGetById}${id}`;
    return this.http.get<Asistencia>(url).pipe(
      catchError(this.handleError),
      map((row) => this.mapFromBackend(row)),
    );
  }

  // POST: crear nuevo registro
  add(datos: any): Observable<Asistencia | null> {
    const payload = this.mapToBackend(datos);
    return this.http.post<Asistencia>(ServiciosRhh.RS_MRCC, payload, this.httpOptions).pipe(
      catchError(this.handleError),
      map((row) => this.mapFromBackend(row)),
    );
  }

  // PUT: actualizar registro
  update(datos: any): Observable<Asistencia | null> {
    const payload = this.mapToBackend(datos);
    return this.http.put<Asistencia>(ServiciosRhh.RS_MRCC, payload, this.httpOptions).pipe(
      catchError(this.handleError),
      map((row) => this.mapFromBackend(row)),
    );
  }

  // POST: seleccionar por criterios - OBLIGATORIO para búsquedas
  selectByCriteria(datos: any): Observable<Asistencia[] | null> {
    const wsCriteria = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_MRCC}${wsCriteria}`;
    console.log('🔍 Consultando asistencias desde backend:', url);
    console.log('📋 Criterios enviados (JSON):', JSON.stringify(datos, null, 2));
    return this.http.post<Asistencia[]>(url, datos, this.httpOptions).pipe(
      map((rows) => this.mapFromBackendArray(rows)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 400) {
          // El backend SAA devuelve 400 cuando no hay registros (comportamiento esperado)
          console.warn(
            '⚠️ Sin asistencias en BD para los criterios dados. Retornando array vacío.',
          );
          return of([]);
        }
        console.error('❌ Error al consultar asistencias:', error);
        return this.handleError(error);
      }),
    );
  }

  // DELETE: eliminar por ID (se recomienda usar inactivar en su lugar)
  delete(id: any): Observable<Asistencia | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosRhh.RS_MRCC}${wsDelete}`;
    return this.http.delete<Asistencia>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  // PUT: inactivar registro (recomendado en lugar de delete)
  inactivar(codigo: number, observacion: string): Observable<Asistencia | null> {
    const payload = {
      codigo,
      observacion,
    };
    return this.update(payload);
  }

  // Manejo de errores HTTP
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

  private mapFromBackend(row: any): Asistencia | null {
    if (!row) return null;

    const fechaHora = row.fechaHora ?? row.fecha ?? null;
    const horaEntrada = this.extractHora(fechaHora);

    return {
      ...row,
      empleadoCodigo: row.empleadoCodigo ?? row.empleado?.codigo ?? null,
      turnoCodigo: row.turnoCodigo ?? 0,
      fecha: fechaHora,
      horaEntrada: row.horaEntrada ?? horaEntrada,
      horaSalida: row.horaSalida ?? null,
      minutosAtraso: row.minutosAtraso ?? 0,
      tipoRegistro: row.tipoRegistro ?? row.tipo ?? '',
      estado: row.estado ?? 1,
    } as Asistencia;
  }

  private mapFromBackendArray(rows: Asistencia[] | null): Asistencia[] | null {
    if (!rows) return rows;
    if (!Array.isArray(rows)) return rows;
    return rows.map((row) => this.mapFromBackend(row) as Asistencia);
  }

  private mapToBackend(datos: any): any {
    if (!datos) return datos;

    const payload: any = {
      codigo: datos.codigo,
      observacion: datos.observacion ?? null,
    };

    if (datos.empleado?.codigo) {
      payload.empleado = { codigo: datos.empleado.codigo };
    } else if (datos.empleadoCodigo) {
      payload.empleado = { codigo: datos.empleadoCodigo };
    }

    payload.fechaHora = this.buildFechaHora(datos);
    payload.fechaRegistro = this.buildFechaRegistro(datos, payload.fechaHora);

    if (datos.tipo !== undefined && datos.tipo !== null) {
      payload.tipo = this.normalizeTipo(datos.tipo);
    } else if (datos.tipoRegistro !== undefined && datos.tipoRegistro !== null) {
      payload.tipo = this.normalizeTipo(datos.tipoRegistro);
    }

    if (datos.origen !== undefined && datos.origen !== null) {
      payload.origen = datos.origen;
    } else {
      payload.origen = 'WEB';
    }

    if (datos.usuarioRegistro !== undefined && datos.usuarioRegistro !== null) {
      payload.usuarioRegistro = datos.usuarioRegistro;
    } else {
      payload.usuarioRegistro = localStorage.getItem('username') || 'sistema';
    }

    return payload;
  }

  private buildFechaRegistro(datos: any, fechaHora: string | null): string {
    if (datos?.fechaRegistro) {
      const value = String(datos.fechaRegistro).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return match[1];
      }
    }

    if (fechaHora) {
      const match = String(fechaHora).match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return match[1];
      }
    }

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private buildFechaHora(datos: any): string | null {
    const fechaBase = datos.fechaHora ?? datos.fecha;
    if (!fechaBase) return null;

    if (fechaBase instanceof Date) {
      return this.formatDateTime(fechaBase);
    }

    const fechaStr = String(fechaBase).trim();
    if (!fechaStr) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      const hora = this.normalizeHora(datos.horaEntrada);
      return `${fechaStr}T${hora}`;
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(fechaStr)) {
      return fechaStr;
    }

    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(fechaStr)) {
      return fechaStr.replace(' ', 'T');
    }

    return fechaStr;
  }

  private normalizeHora(hora: any): string {
    if (!hora) return '00:00:00';
    const value = String(hora).trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
    if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
    return '00:00:00';
  }

  private formatDateTime(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
  }

  private extractHora(fecha: any): string | null {
    if (!fecha) return null;
    const value = String(fecha);
    const match = value.match(/(\d{2}):(\d{2})(?::\d{2})?/);
    if (!match) return null;
    return `${match[1]}:${match[2]}`;
  }

  private normalizeTipo(value: any): string {
    const tipo = String(value ?? '')
      .trim()
      .toUpperCase();

    if (tipo === 'SALIDA' || tipo === 'S') return 'SALIDA';
    if (tipo === 'ENTRADA' || tipo === 'E') return 'ENTRADA';

    // Compatibilidad con valores legacy
    if (tipo === 'M' || tipo === 'MARCACION' || tipo === 'MARCACIÓN') return 'ENTRADA';
    if (tipo === 'F' || tipo === 'T' || tipo === 'P' || tipo === 'V' || tipo === 'L')
      return 'ENTRADA';

    return 'ENTRADA';
  }
}
