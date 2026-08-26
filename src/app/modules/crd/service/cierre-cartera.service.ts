import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';
import {
  CierreCartera,
  CorridaCierreCartera,
  DatosReverso,
  SolicitudCierreCartera,
} from '../model/cierre-cartera/cierre-cartera.model';

/**
 * Servicio HTTP del cierre mensual de cartera (Fase 2).
 *
 * Contrato: docs/crd/API-CIERRE-CARTERA.md. No inventa rutas: cada método corresponde a un
 * endpoint documentado ahí.
 *
 * Manejo de errores: el backend responde 500 con `Content-Type: application/json` y cuerpo
 * `{"mensaje": "Error ...: <mensaje>"}` (mismo estilo que bandas). `extraerMensajeError`
 * extrae `mensaje` y tolera además texto plano; el texto es apto para mostrarlo al usuario.
 *
 * ⚠ `ejecutar` y `reversar` generan y anulan asientos contables reales.
 */
@Injectable({ providedIn: 'root' })
export class CierreCarteraService {
  private http = inject(HttpClient);
  private readonly base = ServiciosCrd.RS_CIERRE_CARTERA;

  /** POST /previsualizar — calcula la corrida SIN grabar nada. Tarda varios segundos. §2.1 */
  previsualizar(solicitud: SolicitudCierreCartera): Observable<CierreCartera> {
    return this.http
      .post<CierreCartera>(`${this.base}/previsualizar`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /** POST /ejecutar — calcula, graba la corrida con su snapshot y genera los asientos. §2.2 */
  ejecutar(solicitud: SolicitudCierreCartera): Observable<CierreCartera> {
    return this.http
      .post<CierreCartera>(`${this.base}/ejecutar`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /** GET /consultar — lo que quedó GRABADO de un período (no recalcula). §2.3 */
  consultar(idEmpresa: number, anio: number, mes: number): Observable<CierreCartera> {
    const params = new HttpParams()
      .set('idEmpresa', idEmpresa)
      .set('anio', anio)
      .set('mes', mes);
    return this.http
      .get<CierreCartera>(`${this.base}/consultar`, { params })
      .pipe(catchError(this.handleError));
  }

  /** POST /reversar/{idCorrida} — anula los asientos de una corrida y libera el período. §2.4 */
  reversar(idCorrida: number, datos: DatosReverso = {}): Observable<CierreCartera> {
    let params = new HttpParams();
    if (datos.usuario) params = params.set('usuario', datos.usuario);
    if (datos.ip) params = params.set('ip', datos.ip);
    if (datos.motivo) params = params.set('motivo', datos.motivo);
    return this.http
      .post<CierreCartera>(`${this.base}/reversar/${idCorrida}`, null, { params })
      .pipe(catchError(this.handleError));
  }

  /** GET /corridas — histórico de corridas de una empresa. §2.5 */
  corridas(idEmpresa: number): Observable<CorridaCierreCartera[]> {
    const params = new HttpParams().set('idEmpresa', idEmpresa);
    return this.http
      .get<CorridaCierreCartera[]>(`${this.base}/corridas`, { params })
      .pipe(catchError(this.handleError));
  }

  // ===================== manejo de errores =====================

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    return throwError(() => this.extraerMensajeError(error));
  };

  /**
   * Extrae el mensaje de negocio del error, apto para mostrarlo al usuario, cubriendo:
   *  1. Objeto JSON `{ "mensaje": "..." }` — la forma real del backend, ya parseada por Angular.
   *  2. String de texto plano (o JSON que llega como string).
   *  3. Envoltura `{ error, text }` de Angular cuando el content-type dice json pero no parsea.
   */
  private extraerMensajeError(error: HttpErrorResponse): string {
    const cuerpo: unknown = error?.error;

    const desdeObjeto = this.leerCampoMensaje(cuerpo);
    if (desdeObjeto) {
      return desdeObjeto;
    }

    if (typeof cuerpo === 'string' && cuerpo.trim()) {
      const desdeTexto = this.leerCampoMensaje(this.intentarJson(cuerpo));
      return (desdeTexto ?? cuerpo).trim();
    }

    if (
      cuerpo &&
      typeof cuerpo === 'object' &&
      typeof (cuerpo as { text?: unknown }).text === 'string'
    ) {
      const texto = (cuerpo as { text: string }).text;
      const desdeTexto = this.leerCampoMensaje(this.intentarJson(texto));
      if (desdeTexto) {
        return desdeTexto;
      }
      if (texto.trim()) {
        return texto.trim();
      }
    }

    if (error?.message) {
      return error.message;
    }
    return 'Ocurrió un error al comunicarse con el servidor.';
  }

  private leerCampoMensaje(valor: unknown): string | null {
    if (valor && typeof valor === 'object') {
      const mensaje = (valor as { mensaje?: unknown }).mensaje;
      if (typeof mensaje === 'string' && mensaje.trim()) {
        return mensaje.trim();
      }
    }
    return null;
  }

  private intentarJson(texto: string): unknown {
    try {
      return JSON.parse(texto);
    } catch {
      return null;
    }
  }
}
