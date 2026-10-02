import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { FuncionesDatosService } from '../../../shared/services/funciones-datos.service';
import {
  ArchivoExcelSeguro,
  CandidatoListadoSeguro,
  CuotaDistribucionSeguro,
  DistribucionPreviewSeguro,
  DocumentoSeguro,
  ExclusionNovedadSeguro,
  FiltrosListarDocumentosSeguro,
  NovedadesSeguro,
  PrestamoDistribucionSeguro,
  PrestamoDocumentoSeguro,
  ResultadoCargaSumaAsegurada,
  SolicitudAnularDocumentoSeguro,
  SolicitudDistribuirSeguro,
  SolicitudGenerarListadoSeguro,
  SolicitudLiberarAPagoSeguro,
  SolicitudRegistrarDocumentoSeguro,
  SolicitudRegistrarNotaSeguro,
  SolicitudSumaAsegurada,
  TipoSeguro,
} from '../model/poliza-seguro/poliza-seguro.model';
import { ServiciosCrd } from './ws-crd';

/**
 * Pólizas de seguro de préstamos (`CRD.POSG`/`PSPR`/`PSCT`). Contrato congelado para la fase 1:
 * docs/crd/API-POLIZAS-SEGURO.md.
 *
 * ⛔ H13: ningún método convierte un error en `null`/`[]`. El contrato manda `{"mensaje": "CODIGO:
 * descripción"}` en 400/404/409/422 (mismo mapeo que `/plvn`), y la pantalla lo muestra tal cual.
 *
 * ⚠️ La carga de suma asegurada por Excel es MULTIPART (corregido 2026-10-02): no hay librería de
 * Excel en el frontend (medido contra `package.json`/`index.html`, el único uso —`dash-ventas`—
 * está roto), así que el backend lee el archivo con Apache POI, igual que
 * `PrestamoService.cargarTablaExcel`. El frontend solo sube el `File` crudo.
 */
@Injectable({ providedIn: 'root' })
export class PolizaSeguroService {
  private http = inject(HttpClient);
  private fechas = inject(FuncionesDatosService);

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // ===================== §2. Suma asegurada =====================

  /** `PUT /posg/sumaAsegurada`. Graba `PRSTVLAS` de un solo préstamo. */
  actualizarSumaAsegurada(solicitud: SolicitudSumaAsegurada): Observable<void> {
    return this.http
      .put<void>(`${ServiciosCrd.RS_POSG}/sumaAsegurada`, solicitud, this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => this.lanzarError(e)));
  }

  /**
   * `POST /posg/sumaAsegurada/carga`, multipart. Con `confirmar=false` solo valida; con `true`
   * graba las filas OK. El `Content-Type` NO se fija a mano: el browser arma el `boundary` solo.
   */
  cargarSumaAseguradaExcel(archivo: File, confirmar: boolean, usuario: string): Observable<ResultadoCargaSumaAsegurada> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    formData.append('confirmar', String(confirmar));
    formData.append('usuario', usuario);

    return this.http
      .post<ResultadoCargaSumaAsegurada>(`${ServiciosCrd.RS_POSG}/sumaAsegurada/carga`, formData)
      .pipe(catchError((e: HttpErrorResponse) => this.lanzarError(e)));
  }

  // ===================== §3. Listado =====================

  /** `GET /posg/listado/preview?tipoSeguro=&fechaCorte=`. No graba nada. */
  previewListado(tipoSeguro: TipoSeguro, fechaCorte: string): Observable<CandidatoListadoSeguro[]> {
    const params = new HttpParams().set('tipoSeguro', tipoSeguro).set('fechaCorte', fechaCorte);
    return this.http
      .get<CandidatoListadoSeguro[]>(`${ServiciosCrd.RS_POSG}/listado/preview`, { params })
      .pipe(catchError((e: HttpErrorResponse) => this.lanzarError(e)));
  }

  /** `GET /posg/listado/preview/excel?tipoSeguro=&fechaCorte=`. Mismo contenido que `previewListado`, como `.xlsx`. */
  previewListadoExcel(tipoSeguro: TipoSeguro, fechaCorte: string): Observable<ArchivoExcelSeguro> {
    const params = new HttpParams().set('tipoSeguro', tipoSeguro).set('fechaCorte', fechaCorte);
    return this.descargarExcel(`${ServiciosCrd.RS_POSG}/listado/preview/excel`, params);
  }

  /** `POST /posg/listado`. Crea el documento (clase FACTURA, estado LISTADO_ENVIADO) y lo congela. */
  generarListado(solicitud: SolicitudGenerarListadoSeguro): Observable<DocumentoSeguro> {
    return this.http.post<unknown>(`${ServiciosCrd.RS_POSG}/listado`, solicitud, this.httpOptions).pipe(
      map((f) => this.convertirDocumento(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  /** `GET /posg/{id}/listado/excel`. El listado ya guardado de un documento, para reimprimir. */
  listadoExcel(id: number): Observable<ArchivoExcelSeguro> {
    return this.descargarExcel(`${ServiciosCrd.RS_POSG}/${id}/listado/excel`);
  }

  // ===================== §4. Registrar documento =====================

  /** `PUT /posg/{id}/documento`. Pasa el documento a DOCUMENTO_REGISTRADO. */
  registrarDocumento(id: number, solicitud: SolicitudRegistrarDocumentoSeguro): Observable<DocumentoSeguro> {
    return this.http.put<unknown>(`${ServiciosCrd.RS_POSG}/${id}/documento`, solicitud, this.httpOptions).pipe(
      map((f) => this.convertirDocumento(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  // ===================== §5. Distribución =====================

  /** `GET /posg/{id}/distribucion/preview`. Calcula sin grabar (§5.3 del contrato). */
  previewDistribucion(id: number): Observable<DistribucionPreviewSeguro> {
    return this.http.get<unknown>(`${ServiciosCrd.RS_POSG}/${id}/distribucion/preview`).pipe(
      map((f) => this.convertirDistribucionPreview(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  /** `POST /posg/{id}/distribuir`. Recalcula (no confía en la vista previa) y escribe en las cuotas, todo o nada. */
  distribuir(id: number, solicitud: SolicitudDistribuirSeguro): Observable<DocumentoSeguro> {
    return this.http.post<unknown>(`${ServiciosCrd.RS_POSG}/${id}/distribuir`, solicitud, this.httpOptions).pipe(
      map((f) => this.convertirDocumento(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  // ===================== §6. Anular =====================

  /** `POST /posg/{id}/anular`. `motivo` obligatorio. Reversa las cuotas si estaba DISTRIBUIDO. */
  anular(id: number, solicitud: SolicitudAnularDocumentoSeguro): Observable<DocumentoSeguro> {
    return this.http.post<unknown>(`${ServiciosCrd.RS_POSG}/${id}/anular`, solicitud, this.httpOptions).pipe(
      map((f) => this.convertirDocumento(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  // ===================== §7. Novedades =====================

  /** `GET /posg/{idFactura}/novedades?desde=&hasta=`. Solo contra una factura en estado 3 o 4. */
  novedades(idFactura: number, desde?: string | null, hasta?: string | null): Observable<NovedadesSeguro> {
    const params = this.paramsRangoFechas(desde, hasta);
    return this.http.get<unknown>(`${ServiciosCrd.RS_POSG}/${idFactura}/novedades`, { params }).pipe(
      map((f) => this.convertirNovedades(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  /** `GET /posg/{idFactura}/novedades/excel?desde=&hasta=`. Dos hojas: Inclusiones y Exclusiones. */
  novedadesExcel(idFactura: number, desde?: string | null, hasta?: string | null): Observable<ArchivoExcelSeguro> {
    const params = this.paramsRangoFechas(desde, hasta);
    return this.descargarExcel(`${ServiciosCrd.RS_POSG}/${idFactura}/novedades/excel`, params);
  }

  /** `POST /posg/{idFactura}/nota`. Registra una ND (`clase:2`) o NC (`clase:3`) contra la factura madre. */
  registrarNota(idFactura: number, solicitud: SolicitudRegistrarNotaSeguro): Observable<DocumentoSeguro> {
    return this.http.post<unknown>(`${ServiciosCrd.RS_POSG}/${idFactura}/nota`, solicitud, this.httpOptions).pipe(
      map((f) => this.convertirDocumento(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  // ===================== §8. Consultas =====================

  /** `GET /posg/listar?tipoSeguro=&estado=&clase=`. */
  listar(filtros?: FiltrosListarDocumentosSeguro): Observable<DocumentoSeguro[]> {
    let params = new HttpParams();
    if (filtros?.tipoSeguro != null) params = params.set('tipoSeguro', filtros.tipoSeguro);
    if (filtros?.estado != null) params = params.set('estado', filtros.estado);
    if (filtros?.clase != null) params = params.set('clase', filtros.clase);

    return this.http.get<unknown[]>(`${ServiciosCrd.RS_POSG}/listar`, { params }).pipe(
      map((filas) => filas.map((f) => this.convertirDocumento(f))),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  /** `GET /posg/{id}`. */
  getId(id: number): Observable<DocumentoSeguro> {
    return this.http.get<unknown>(`${ServiciosCrd.RS_POSG}/${id}`).pipe(
      map((f) => this.convertirDocumento(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
  }

  /** `GET /posg/{id}/prestamos`. Los `PSPR` del documento, con partícipe y cédula ya resueltos. */
  prestamos(id: number): Observable<PrestamoDocumentoSeguro[]> {
    return this.http
      .get<PrestamoDocumentoSeguro[]>(`${ServiciosCrd.RS_POSG}/${id}/prestamos`)
      .pipe(catchError((e: HttpErrorResponse) => this.lanzarError(e)));
  }

  // ===================== §9. Liberar a pago (fase 1: siempre 409) =====================

  /** `POST /posg/{id}/liberar`. Fase 1: responde 409 `INTEGRACION_CXP_PENDIENTE` siempre — se muestra tal cual. */
  liberarAPago(id: number, solicitud: SolicitudLiberarAPagoSeguro): Observable<DocumentoSeguro> {
    return this.http.post<unknown>(`${ServiciosCrd.RS_POSG}/${id}/liberar`, solicitud, this.httpOptions).pipe(
      map((f) => this.convertirDocumento(f)),
      catchError((e: HttpErrorResponse) => this.lanzarError(e))
    );
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

  private paramsRangoFechas(desde?: string | null, hasta?: string | null): HttpParams {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return params;
  }

  private convertirDocumento(raw: any): DocumentoSeguro {
    return {
      ...raw,
      fechaCorte: this.fechas.convertirFechaDesdeBackend(raw?.fechaCorte),
      fechaEmision: this.fechas.convertirFechaDesdeBackend(raw?.fechaEmision),
      fechaInicio: this.fechas.convertirFechaDesdeBackend(raw?.fechaInicio),
      fechaFin: this.fechas.convertirFechaDesdeBackend(raw?.fechaFin),
      notas: Array.isArray(raw?.notas) ? raw.notas : [],
    };
  }

  private convertirCuota(raw: any): CuotaDistribucionSeguro {
    return { ...raw, fechaVencimiento: this.fechas.convertirFechaDesdeBackend(raw?.fechaVencimiento) };
  }

  private convertirPrestamoDistribucion(raw: any): PrestamoDistribucionSeguro {
    return {
      ...raw,
      cuotas: Array.isArray(raw?.cuotas) ? raw.cuotas.map((c: unknown) => this.convertirCuota(c)) : [],
    };
  }

  private convertirDistribucionPreview(raw: any): DistribucionPreviewSeguro {
    return {
      ...raw,
      prestamos: Array.isArray(raw?.prestamos) ? raw.prestamos.map((p: unknown) => this.convertirPrestamoDistribucion(p)) : [],
      prestamosSinCuotasEnVigencia: Array.isArray(raw?.prestamosSinCuotasEnVigencia) ? raw.prestamosSinCuotasEnVigencia : [],
    };
  }

  private convertirExclusion(raw: any): ExclusionNovedadSeguro {
    return { ...raw, fecha: this.fechas.convertirFechaDesdeBackend(raw?.fecha) };
  }

  private convertirNovedades(raw: any): NovedadesSeguro {
    return {
      inclusiones: Array.isArray(raw?.inclusiones) ? raw.inclusiones : [],
      exclusiones: Array.isArray(raw?.exclusiones) ? raw.exclusiones.map((e: unknown) => this.convertirExclusion(e)) : [],
    };
  }

  // ===================== documentos .xlsx (armados por el backend) =====================

  private descargarExcel(url: string, params?: HttpParams): Observable<ArchivoExcelSeguro> {
    return this.http.get(url, { params, responseType: 'blob', observe: 'response' }).pipe(
      map((resp) => this.comoArchivo(resp)),
      catchError((e: HttpErrorResponse) => this.lanzarErrorDeDocumento(e))
    );
  }

  private comoArchivo(resp: HttpResponse<Blob>): ArchivoExcelSeguro {
    return {
      blob: resp.body ?? new Blob(),
      nombreArchivo: PolizaSeguroService.nombreDesdeContentDisposition(resp.headers.get('Content-Disposition')),
    };
  }

  private static nombreDesdeContentDisposition(disposition: string | null): string {
    const match = /filename="?([^";]+)"?/.exec(disposition ?? '');
    return match ? match[1].trim() : '';
  }

  // ===================== errores =====================

  /** El error llega como `{"mensaje": "CODIGO: descripción"}` (mismo mapeo que `/plvn`); nunca se muestra el JSON crudo. */
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

  /** Los endpoints de `.xlsx` piden `responseType: 'blob'`, así que un error también llega como `Blob` sin parsear. */
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
        // Cuerpo de error que no es JSON: se cae al mensaje genérico, nunca se muestra crudo.
      }
    }
    return e.status === 0
      ? 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.'
      : `Error inesperado del servidor (HTTP ${e.status}).`;
  }
}
