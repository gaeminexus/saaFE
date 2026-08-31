import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import {
  CuentaTipoAporte,
  SolicitudCrearCuentaTipoAporte,
  SolicitudEditarCuentaTipoAporte,
} from '../model/cuenta-tipo-aporte';
import { ServiciosCrd } from './ws-crd';

/**
 * Envoltorio LOCAL — no es parte del contrato. `/ctap` no usa el sobre `{exito,...}`: en éxito
 * el cuerpo es la fila directa, y en error es `{mensaje}` (envuelto por el filtro global
 * `MensajeErrorJsonFilter` aunque la clase REST arme el cuerpo como texto plano — verificado en
 * `CuentaTipoAporteRest.java`, no es texto plano en el cable). Se normaliza acá para no ramificar
 * por HTTP status en cada pantalla.
 */
export interface ResultadoOperacionCtap<T> {
  exito: boolean;
  resultado?: T;
  mensaje?: string;
}

/** Mantenimiento de CRD.CTAP (docs/crd/API-CUENTAS-TIPO-APORTE.md). */
@Injectable({ providedIn: 'root' })
export class CuentaTipoAporteService {
  private http = inject(HttpClient);

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  /** Todas las configuraciones, activas e inactivas. */
  getAll(): Observable<CuentaTipoAporte[]> {
    const url = `${ServiciosCrd.RS_CTAP}/getAll`;
    return this.http.get<CuentaTipoAporte[]>(url).pipe(catchError(() => of([])));
  }

  /** Solo las ACTIVAS de una empresa. */
  porEmpresa(idEmpresa: number): Observable<CuentaTipoAporte[]> {
    const url = `${ServiciosCrd.RS_CTAP}/porEmpresa/${idEmpresa}`;
    return this.http.get<CuentaTipoAporte[]>(url).pipe(catchError(() => of([])));
  }

  /** `estado` lo pone el servidor (siempre ACTIVO). Responde 201. */
  crear(solicitud: SolicitudCrearCuentaTipoAporte): Observable<ResultadoOperacionCtap<CuentaTipoAporte>> {
    const url = ServiciosCrd.RS_CTAP;
    return this.http.post<CuentaTipoAporte>(url, solicitud, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<CuentaTipoAporte>(e)))
    );
  }

  /**
   * Edita SOLO las dos cuentas. No mandar `tipoAporte`/`empresa`/`estado`: el backend los ignora
   * (§2 del contrato) — el tipo de la solicitud ya los excluye.
   */
  editar(solicitud: SolicitudEditarCuentaTipoAporte): Observable<ResultadoOperacionCtap<CuentaTipoAporte>> {
    const url = ServiciosCrd.RS_CTAP;
    return this.http.put<CuentaTipoAporte>(url, solicitud, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<CuentaTipoAporte>(e)))
    );
  }

  /** Baja lógica (`estado = 0`). Idempotente. No hay DELETE — nunca lo va a haber para esta tabla. */
  desactivar(codigo: number): Observable<ResultadoOperacionCtap<CuentaTipoAporte>> {
    const url = `${ServiciosCrd.RS_CTAP}/desactivar/${codigo}`;
    return this.http.put<CuentaTipoAporte>(url, null, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<CuentaTipoAporte>(e)))
    );
  }

  /** Reactiva. Idempotente si ya estaba activa; 409 si ya hay OTRA fila activa para el mismo (tipo, empresa). */
  activar(codigo: number): Observable<ResultadoOperacionCtap<CuentaTipoAporte>> {
    const url = `${ServiciosCrd.RS_CTAP}/activar/${codigo}`;
    return this.http.put<CuentaTipoAporte>(url, null, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<CuentaTipoAporte>(e)))
    );
  }

  /**
   * Todos los errores llegan como `{"mensaje": "..."}` — el `@Provider` global
   * `MensajeErrorJsonFilter` los envuelve aunque la clase REST arme el cuerpo como texto plano.
   */
  private normalizarError<T>(e: HttpErrorResponse): ResultadoOperacionCtap<T> {
    const cuerpo = e.error;
    const mensaje = cuerpo && typeof cuerpo === 'object' && typeof cuerpo.mensaje === 'string' ? cuerpo.mensaje : null;

    return {
      exito: false,
      mensaje:
        mensaje ??
        (e.status === 0
          ? 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.'
          : `Error inesperado del servidor (HTTP ${e.status}).`),
    };
  }
}
