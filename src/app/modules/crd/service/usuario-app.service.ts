import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { FuncionesDatosService } from '../../../shared/services/funciones-datos.service';
import { SolicitudUsuarioApp, UsuarioAppDTO } from '../model/usuario-app/usuario-app.model';
import { ServiciosCrd } from './ws-crd';

/**
 * Credenciales de la app móvil (`CRD.USAP`). Contrato: docs/crd/API-USUARIO-APP-MOVIL.md.
 *
 * ⛔ H13: ningún método convierte un error en `null`/`[]`. La única excepción es el 404 de `estado`,
 * que el contrato define como "esa cédula no tiene cuenta" (respuesta válida, no falla): devuelve
 * `null`. Un 500, un 0 (sin red) o cualquier otro código se propaga por el canal `error` con su
 * mensaje, para que la pantalla no confunda "sin cuenta" con "el servidor se rompió".
 *
 * El 400 de crear/resetearClave/reactivar trae `{"mensaje": "..."}` con el texto específico de la
 * regla que falló; el 500 viene como texto suelto ("Error al ..."). Se leen las dos formas.
 */
@Injectable({ providedIn: 'root' })
export class UsuarioAppService {
  private http = inject(HttpClient);
  private fechas = inject(FuncionesDatosService);

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  /** `GET /usap/estado/{identificacion}` → `null` si el backend responde 404 (sin cuenta). */
  estado(identificacion: string): Observable<UsuarioAppDTO | null> {
    return this.http.get<unknown>(`${ServiciosCrd.RS_USAP}/estado/${encodeURIComponent(identificacion.trim())}`).pipe(
      map((dto) => this.convertir(dto)),
      catchError((e: HttpErrorResponse) => (e.status === 404 ? of(null) : this.lanzarError(e)))
    );
  }

  /** `POST /usap/crear` → 201. 400 si la cédula no existe en el sistema o ya tiene cuenta. */
  crear(solicitud: SolicitudUsuarioApp): Observable<UsuarioAppDTO> {
    return this.escribir('crear', solicitud);
  }

  /** `POST /usap/resetearClave` → 200. También desbloquea. 400 si no hay cuenta o está eliminada. */
  resetearClave(solicitud: SolicitudUsuarioApp): Observable<UsuarioAppDTO> {
    return this.escribir('resetearClave', solicitud);
  }

  /** `POST /usap/reactivar` → 200. Solo sobre una cuenta eliminada; 400 en cualquier otro estado. */
  reactivar(solicitud: SolicitudUsuarioApp): Observable<UsuarioAppDTO> {
    return this.escribir('reactivar', solicitud);
  }

  private escribir(verbo: string, solicitud: SolicitudUsuarioApp): Observable<UsuarioAppDTO> {
    return this.http.post<unknown>(`${ServiciosCrd.RS_USAP}/${verbo}`, solicitud, this.httpOptions).pipe(
      map((dto) => this.convertir(dto) as UsuarioAppDTO),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  private convertir(crudo: unknown): UsuarioAppDTO | null {
    if (!crudo || typeof crudo !== 'object') return null;
    const d = crudo as Record<string, any>;
    return {
      codigo: d['codigo'],
      idEntidad: d['idEntidad'] ?? null,
      identificacion: d['identificacion'],
      estado: Number(d['estado']),
      intentosFallidos: d['intentosFallidos'] ?? null,
      bloqueadoHasta: this.fechas.convertirFechaDesdeBackend(d['bloqueadoHasta']),
      debeCambiarClave: d['debeCambiarClave'] === true,
      fechaCreacion: this.fechas.convertirFechaDesdeBackend(d['fechaCreacion']),
      fechaUltimoAcceso: this.fechas.convertirFechaDesdeBackend(d['fechaUltimoAcceso']),
      usuarioRegistro: d['usuarioRegistro'] ?? null,
    };
  }

  private mensajeDeError(e: HttpErrorResponse): string {
    const cuerpo = e.error;
    if (cuerpo && typeof cuerpo === 'object' && typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim()) {
      return cuerpo.mensaje;
    }
    if (typeof cuerpo === 'string' && cuerpo.trim() && !cuerpo.trim().startsWith('<')) return cuerpo;
    if (e.status === 0) return 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.';
    return `Error inesperado del servidor (HTTP ${e.status}).`;
  }

  private lanzarError(e: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(this.mensajeDeError(e)));
  }
}
