import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  AnularOrdenBeneficioSocialRequest,
  ConfirmarPagoOrdenBeneficioSocialRequest,
  DetalleOrdenBeneficioSocial,
  EnviarATesoreriaRequest,
  FiltrosListarOrdenesBeneficioSocial,
  GenerarOrdenBeneficioSocialRequest,
  OrdenBeneficioSocialListado,
  ResultadoConfirmarPago,
  ResultadoEnviarATesoreria,
  ResultadoGenerarOrdenBeneficioSocial,
} from '../model/orden-beneficio-social';
import { ServiciosRhh } from './ws-rrh';

/**
 * Órdenes de pago de beneficio social (RHH.ODBS): cierra el ciclo del décimo acumulado que hoy se
 * genera en backend y nunca se paga. Contrato: `docs/rrh/API-PAGO-BENEFICIOS-SOCIALES.md`.
 *
 * **Los endpoints de este servicio todavía no existen en el backend** (verificado 2026-09-01).
 * Implementado contra el contrato congelado; si algo no cierra al integrar, se corrige el
 * documento primero y después este archivo — no al revés.
 */
@Injectable({ providedIn: 'root' })
export class OrdenBeneficioSocialService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** GET /odbs/listar — la bandeja (contrato §1.3bis). Solo `idEmpresa` es obligatorio. */
  listar(filtros: FiltrosListarOrdenesBeneficioSocial): Observable<OrdenBeneficioSocialListado[]> {
    let params = new HttpParams().set('idEmpresa', filtros.idEmpresa);
    if (filtros.anio != null) params = params.set('anio', filtros.anio);
    if (filtros.tipoBeneficio != null) params = params.set('tipoBeneficio', filtros.tipoBeneficio);
    if (filtros.estado != null) params = params.set('estado', filtros.estado);
    return this.http
      .get<OrdenBeneficioSocialListado[]>(`${ServiciosRhh.RS_ODBS}/listar`, { params })
      .pipe(catchError(this.handleError));
  }

  /** GET /odbs/detalle/{id} — liquidaciones de una orden (contrato §1.3). */
  detalle(idOrden: number): Observable<DetalleOrdenBeneficioSocial> {
    return this.http
      .get<DetalleOrdenBeneficioSocial>(`${ServiciosRhh.RS_ODBS}/detalle/${idOrden}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * POST /odbs/generar — agrupa las liquidaciones sueltas y crea la cabecera (contrato §1.2).
   * `exito: false` con HTTP 200 es una respuesta válida (no hay liquidaciones pendientes): el
   * caller debe leer `exito`, no asumir que llegar al `next` significa que se creó la orden.
   */
  generar(datos: GenerarOrdenBeneficioSocialRequest): Observable<ResultadoGenerarOrdenBeneficioSocial> {
    return this.http
      .post<ResultadoGenerarOrdenBeneficioSocial>(`${ServiciosRhh.RS_ODBS}/generar`, datos, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error ?? error)));
  }

  /** POST /odbs/enviarATesoreria/{id} — registra el pago en la bandeja de tesorería (contrato §1.4). */
  enviarATesoreria(idOrden: number, datos: EnviarATesoreriaRequest): Observable<ResultadoEnviarATesoreria> {
    return this.http
      .post<ResultadoEnviarATesoreria>(
        `${ServiciosRhh.RS_ODBS}/enviarATesoreria/${idOrden}`,
        datos,
        this.httpOptions,
      )
      .pipe(catchError((error) => throwError(() => error.error ?? error)));
  }

  /**
   * POST /odbs/confirmarPago/{id} — cierra el ciclo y contabiliza (contrato §1.5). Exige que el
   * pago esté CONFIRMADO en tesorería; si no, 409.
   */
  confirmarPago(
    idOrden: number,
    datos: ConfirmarPagoOrdenBeneficioSocialRequest,
  ): Observable<ResultadoConfirmarPago> {
    return this.http
      .post<ResultadoConfirmarPago>(`${ServiciosRhh.RS_ODBS}/confirmarPago/${idOrden}`, datos, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error ?? error)));
  }

  /**
   * POST /odbs/anular/{id} — deshace la orden (contrato §1.6). El contrato no documenta una forma
   * de respuesta para el 200 (solo describe el efecto), así que no se tipa — mismo criterio que
   * `AnticipoTrabajadorService.anular()`.
   */
  anular(idOrden: number, datos: AnularOrdenBeneficioSocialRequest): Observable<unknown> {
    return this.http
      .post(`${ServiciosRhh.RS_ODBS}/anular/${idOrden}`, datos, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error ?? error)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error.error ?? error);
  }
}
