import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { FuncionesDatosService } from '../../../shared/services/funciones-datos.service';
import {
  CuadroPlazoVencido,
  DeclaracionPlazoVencido,
  DocumentoPlazoVencido,
  FiltrosListarPlazoVencido,
  FormatoDocumentoPlazoVencido,
  LiquidacionPlazoVencido,
  ResultadoDeclaracionPlazoVencido,
  ResultadoReversoPlazoVencido,
  SolicitudDeclararPlazoVencido,
  SolicitudDocumentosMasivosPlazoVencido,
  SolicitudLiquidarPlazoVencido,
  SolicitudRevertirPlazoVencido,
  UltimoEncabezadoPlazoVencido,
} from '../model/plazo-vencido/plazo-vencido.model';
import { ServiciosCrd } from './ws-crd';

/**
 * Declaración de plazo vencido (`CRD.PLVN`/`CRD.DPLV`). Contrato congelado:
 * docs/crd/API-PASE-A-PLAZO-VENCIDO.md.
 *
 * ⛔ H13: ningún método de este servicio convierte un error en `null`/`[]`. El contrato manda el
 * cuerpo `{"mensaje": "CODIGO: descripción"}` en 400/404/409/422, y la pantalla lo tiene que mostrar
 * tal cual — así que todo error se propaga por el canal `error` del `Observable` con ese texto, no
 * se lo traga un valor por defecto que la pantalla no pueda distinguir de "no hay datos".
 */
@Injectable({ providedIn: 'root' })
export class PlazoVencidoService {
  private http = inject(HttpClient);
  private fechas = inject(FuncionesDatosService);

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // ===================== Lectura =====================

  /** `GET /plvn/candidatos?fechaCorte=`. No graba nada (§3). */
  candidatos(fechaCorte: string): Observable<CuadroPlazoVencido[]> {
    const params = new HttpParams().set('fechaCorte', fechaCorte);
    return this.http.get<unknown[]>(`${ServiciosCrd.RS_PLVN}/candidatos`, { params }).pipe(
      map((filas) => filas.map((f) => this.convertirCuadro(f))),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  /** `GET /plvn/ultimoEncabezado` (§4). Los 4 campos vienen `null` si nunca se declaró nada. */
  ultimoEncabezado(): Observable<UltimoEncabezadoPlazoVencido> {
    return this.http
      .get<UltimoEncabezadoPlazoVencido>(`${ServiciosCrd.RS_PLVN}/ultimoEncabezado`)
      .pipe(catchError((e: HttpErrorResponse) => this.lanzarError(e)));
  }

  /** `GET /plvn/listar?estado=&desde=&hasta=` (§9): bandeja de Contabilidad e historial de Crédito. */
  listar(filtros?: FiltrosListarPlazoVencido): Observable<DeclaracionPlazoVencido[]> {
    let params = new HttpParams();
    if (filtros?.estado != null) params = params.set('estado', filtros.estado);
    if (filtros?.desde) params = params.set('desde', filtros.desde);
    if (filtros?.hasta) params = params.set('hasta', filtros.hasta);

    return this.http.get<unknown[]>(`${ServiciosCrd.RS_PLVN}/listar`, { params }).pipe(
      map((filas) => filas.map((f) => this.convertirDeclaracion(f))),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  /** `GET /plvn/getId/{id}` (§9). */
  getId(id: number): Observable<DeclaracionPlazoVencido> {
    return this.http.get<unknown>(`${ServiciosCrd.RS_PLVN}/getId/${id}`).pipe(
      map((f) => this.convertirDeclaracion(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  // ===================== Escritura =====================

  /** `POST /plvn/declarar` (§5). Todo o nada por lote: si un préstamo falla, no se declara ninguno. */
  declarar(solicitud: SolicitudDeclararPlazoVencido): Observable<ResultadoDeclaracionPlazoVencido[]> {
    return this.http
      .post<ResultadoDeclaracionPlazoVencido[]>(`${ServiciosCrd.RS_PLVN}/declarar`, solicitud, this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => this.lanzarError(e)));
  }

  /** `POST /plvn/{id}/liquidar` (§6). Devuelve la declaración completa ya en estado 2 LIQUIDADA. */
  liquidar(id: number, solicitud: SolicitudLiquidarPlazoVencido): Observable<DeclaracionPlazoVencido> {
    return this.http
      .post<unknown>(`${ServiciosCrd.RS_PLVN}/${id}/liquidar`, solicitud, this.httpOptions)
      .pipe(
        map((f) => this.convertirDeclaracion(f)),
        catchError((e: HttpErrorResponse) => this.lanzarError(e))
      );
  }

  /** `POST /plvn/{id}/revertir` (§7). Solo estado 1 o 2; pide `motivo` obligatorio. */
  revertir(id: number, solicitud: SolicitudRevertirPlazoVencido): Observable<ResultadoReversoPlazoVencido> {
    return this.http
      .post<ResultadoReversoPlazoVencido>(`${ServiciosCrd.RS_PLVN}/${id}/revertir`, solicitud, this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => this.lanzarError(e)));
  }

  // ===================== Documentos (§8) =====================

  /** `GET /plvn/{id}/memorando?formato=`. Siempre desde la foto de `PLVN`: reimprimir da el mismo documento. */
  memorando(id: number, formato: FormatoDocumentoPlazoVencido = 'PDF'): Observable<DocumentoPlazoVencido> {
    return this.descargarDocumento(`${ServiciosCrd.RS_PLVN}/${id}/memorando`, formato);
  }

  /** `GET /plvn/{id}/liquidacion?formato=`. 409 `NO_LIQUIDADA` si la declaración sigue en estado 1. */
  liquidacionDocumento(id: number, formato: FormatoDocumentoPlazoVencido = 'PDF'): Observable<DocumentoPlazoVencido> {
    return this.descargarDocumento(`${ServiciosCrd.RS_PLVN}/${id}/liquidacion`, formato);
  }

  /**
   * `POST /plvn/documentos` (§8bis): un solo ZIP con memorando (siempre) y liquidación (solo si
   * existe) de cada declaración. Todo o nada: si algún `id` no existe, el backend responde 404
   * `DECLARACION_NO_ENCONTRADA` sin armar el ZIP — no hay ZIP parcial que distinguir.
   */
  documentosMasivos(ids: number[], formato: FormatoDocumentoPlazoVencido = 'PDF'): Observable<DocumentoPlazoVencido> {
    const solicitud: SolicitudDocumentosMasivosPlazoVencido = { ids, formato };
    return this.http
      .post(`${ServiciosCrd.RS_PLVN}/documentos`, solicitud, { responseType: 'blob', observe: 'response' })
      .pipe(
        map((resp) => this.comoDocumento(resp)),
        catchError((e: HttpErrorResponse) => this.lanzarErrorDeDocumento(e))
      );
  }

  private descargarDocumento(url: string, formato: FormatoDocumentoPlazoVencido): Observable<DocumentoPlazoVencido> {
    const params = new HttpParams().set('formato', formato);
    return this.http.get(url, { params, responseType: 'blob', observe: 'response' }).pipe(
      map((resp) => this.comoDocumento(resp)),
      catchError((e: HttpErrorResponse) => this.lanzarErrorDeDocumento(e))
    );
  }

  private comoDocumento(resp: HttpResponse<Blob>): DocumentoPlazoVencido {
    return {
      blob: resp.body ?? new Blob(),
      nombreArchivo: PlazoVencidoService.nombreDesdeContentDisposition(resp.headers.get('Content-Disposition')),
    };
  }

  private static nombreDesdeContentDisposition(disposition: string | null): string {
    const match = /filename="?([^";]+)"?/.exec(disposition ?? '');
    return match ? match[1].trim() : '';
  }

  // ===================== fechas =====================

  /** `yyyy-MM-dd` local, para `LocalDate`. Nunca `toISOString()`: descarta el offset. */
  formatearFecha(fecha: Date | string | null | undefined): string | null {
    if (!fecha) return null;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return null;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  private convertirCuadro(raw: any): CuadroPlazoVencido {
    return {
      ...raw,
      fechaInicio: this.fechas.convertirFechaDesdeBackend(raw?.fechaInicio),
      fechaFin: this.fechas.convertirFechaDesdeBackend(raw?.fechaFin),
      fechaUltimoCobro: this.fechas.convertirFechaDesdeBackend(raw?.fechaUltimoCobro),
      fechaInicioMora: this.fechas.convertirFechaDesdeBackend(raw?.fechaInicioMora),
      inconsistencias: Array.isArray(raw?.inconsistencias) ? raw.inconsistencias : [],
    };
  }

  private convertirLiquidacion(raw: any): LiquidacionPlazoVencido | null {
    if (!raw) return null;
    return {
      ...raw,
      fechaCorte: this.fechas.convertirFechaDesdeBackend(raw.fechaCorte),
      fecha: this.fechas.convertirFechaDesdeBackend(raw.fecha),
    };
  }

  private convertirDeclaracion(raw: any): DeclaracionPlazoVencido {
    return {
      ...raw,
      fechaCorte: this.fechas.convertirFechaDesdeBackend(raw?.fechaCorte),
      fechaDeclaracion: this.fechas.convertirFechaDesdeBackend(raw?.fechaDeclaracion),
      fechaReverso: this.fechas.convertirFechaDesdeBackend(raw?.fechaReverso),
      cuadro: this.convertirCuadro(raw?.cuadro),
      liquidacion: this.convertirLiquidacion(raw?.liquidacion),
    };
  }

  // ===================== errores =====================

  /** El error llega como `{"mensaje": "CODIGO: descripción"}` (§2.6); nunca se muestra el JSON crudo. */
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

  /**
   * Los endpoints de documento piden `responseType: 'blob'`, así que un error también llega como
   * `Blob` (el mismo `{"mensaje": "..."}` del resto, pero sin parsear) — hay que leerlo antes de
   * poder mostrarlo.
   */
  private lanzarErrorDeDocumento(e: HttpErrorResponse): Observable<never> {
    const cuerpo = e.error;
    if (cuerpo instanceof Blob) {
      return from(cuerpo.text()).pipe(
        switchMap((texto) => throwError(() => new Error(this.mensajeDeTextoJson(texto, e))))
      );
    }
    return this.lanzarError(e);
  }

  private mensajeDeTextoJson(texto: string, e: HttpErrorResponse): string {
    if (texto && texto.trim()) {
      try {
        const obj = JSON.parse(texto);
        if (obj && typeof obj.mensaje === 'string' && obj.mensaje.trim()) return obj.mensaje;
      } catch {
        // Cuerpo de error que no es JSON (p. ej. una página de error del servidor): se ignora y
        // se cae al mensaje genérico de abajo, nunca se muestra crudo.
      }
    }
    return e.status === 0
      ? 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.'
      : `Error inesperado del servidor (HTTP ${e.status}).`;
  }
}
