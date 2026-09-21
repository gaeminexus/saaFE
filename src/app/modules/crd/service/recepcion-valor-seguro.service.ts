import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import {
  RecepcionValorSeguro,
  SolicitudAnulacionRecepcion,
  SolicitudAprobacionRecepcion,
  SolicitudRechazoRecepcion,
  SolicitudRegistroRecepcion,
} from '../model/recepcion-valor-seguro';
import { ServiciosCrd } from './ws-crd';

/** Resultado de una escritura, normalizado: la pantalla no ramifica por código HTTP. */
export interface ResultadoRecepcion {
  exito: boolean;
  mensaje?: string;
}

/**
 * Recepción de valores de seguro (`CRD.RVSG`). Contrato: docs/crd/API-RECEPCION-VALORES-SEGURO.md.
 *
 * El contrato fija las URLs y el cuerpo de los POST, pero no la forma exacta de las respuestas
 * (dice «estilo de `PrestamoRest`»: `{exito, etapa, mensaje, resultado}`). Por eso las lecturas
 * aceptan tanto el arreglo pelado como el sobre con `resultado`, y las escrituras se dan por
 * buenas solo con HTTP 2xx y sin `exito: false` en el cuerpo.
 */
@Injectable({ providedIn: 'root' })
export class RecepcionValorSeguroService {
  private http = inject(HttpClient);

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  /**
   * Recepciones en estado 1 REGISTRADO, para la bandeja de contabilidad. `null` = la consulta
   * falló: quien llama tiene que distinguirlo de `[]` («no hay pendientes»).
   */
  pendientes(): Observable<RecepcionValorSeguro[] | null> {
    return this.http.get<unknown>(`${ServiciosCrd.RS_RVSG}/pendientes`).pipe(
      map((cuerpo) => this.comoLista(cuerpo)),
      catchError(() => of(null))
    );
  }

  /** Todas las recepciones de un partícipe. `null` = la consulta falló (no es «no tiene»). */
  porEntidad(idEntidad: number): Observable<RecepcionValorSeguro[] | null> {
    return this.http.get<unknown>(`${ServiciosCrd.RS_RVSG}/porEntidad/${idEntidad}`).pipe(
      map((cuerpo) => this.comoLista(cuerpo)),
      catchError(() => of(null))
    );
  }

  /** Solo desde APROBADO: reversa el asiento y el aporte. 409 si el partícipe ya usó el dinero. */
  anular(id: number, solicitud: SolicitudAnulacionRecepcion): Observable<ResultadoRecepcion> {
    return this.escribir(`${ServiciosCrd.RS_RVSG}/${id}/anular`, solicitud);
  }

  registrar(solicitud: SolicitudRegistroRecepcion): Observable<ResultadoRecepcion> {
    return this.escribir(`${ServiciosCrd.RS_RVSG}/registrar`, solicitud);
  }

  aprobar(id: number, solicitud: SolicitudAprobacionRecepcion): Observable<ResultadoRecepcion> {
    return this.escribir(`${ServiciosCrd.RS_RVSG}/${id}/aprobar`, solicitud);
  }

  rechazar(id: number, solicitud: SolicitudRechazoRecepcion): Observable<ResultadoRecepcion> {
    return this.escribir(`${ServiciosCrd.RS_RVSG}/${id}/rechazar`, solicitud);
  }

  /** `yyyy-MM-dd` local para `LocalDate`. Nunca `toISOString()`: descarta el offset. */
  formatearFecha(fecha: Date | string | null | undefined): string | null {
    if (!fecha) return null;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return null;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  private escribir(url: string, cuerpo: unknown): Observable<ResultadoRecepcion> {
    return this.http.post<unknown>(url, cuerpo, this.httpOptions).pipe(
      map((resp) => {
        const sobre = resp && typeof resp === 'object' ? (resp as { exito?: boolean; mensaje?: string }) : null;
        if (sobre && sobre.exito === false) {
          return { exito: false, mensaje: sobre.mensaje ?? 'El servidor no pudo completar la operación.' };
        }
        return { exito: true, mensaje: sobre?.mensaje };
      }),
      catchError((e: HttpErrorResponse) => of({ exito: false, mensaje: this.mensajeDeError(e) }))
    );
  }

  private comoLista(cuerpo: unknown): RecepcionValorSeguro[] {
    if (Array.isArray(cuerpo)) return cuerpo as RecepcionValorSeguro[];
    const resultado = (cuerpo as { resultado?: unknown } | null)?.resultado;
    if (Array.isArray(resultado)) return resultado as RecepcionValorSeguro[];
    throw new Error('Respuesta de /rvsg/pendientes con una forma inesperada');
  }

  /** El error llega como `{"mensaje": "..."}`; nunca se muestra el JSON crudo. */
  private mensajeDeError(e: HttpErrorResponse): string {
    const cuerpo = e.error;
    if (cuerpo && typeof cuerpo === 'object' && typeof cuerpo.mensaje === 'string') return cuerpo.mensaje;
    if (typeof cuerpo === 'string' && cuerpo.trim() && !cuerpo.trim().startsWith('<')) return cuerpo;
    if (e.status === 0) return 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.';
    return `Error inesperado del servidor (HTTP ${e.status}).`;
  }
}
