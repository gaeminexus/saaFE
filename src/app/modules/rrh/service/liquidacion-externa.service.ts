import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import {
  AnularLiquidacionExternaRequest,
  DetalleLiquidacionExterna,
  EnviarATesoreriaLiquidacionExternaRequest,
  EnviarATesoreriaLiquidacionExternaResponse,
  LiquidacionExterna,
  RegistrarLiquidacionExternaRequest,
} from '../model/liquidacion-externa';
import { ServiciosRhh } from './ws-rrh';

/**
 * Liquidaciones de ex-colaboradores de la administración anterior (`RHH.LQEX`/`RHH.DLEX`).
 * Contrato: `docs/rrh/API-LIQUIDACION-EXCOLABORADORES.md`.
 *
 * **Los endpoints de este servicio todavía no existen en el backend** (verificado 2026-09-30, ver
 * contrato §3 "el backend lo implementa en paralelo"). Implementado contra el contrato congelado;
 * si algo no cierra al integrar, se corrige el documento primero y después este archivo — no al
 * revés (mismo criterio que `OrdenBeneficioSocialService`).
 *
 * A propósito **no** se usa el `handleError` que convierte un error en lista vacía
 * (`if (+error.status === 200) return of(null)`): el error se propaga siempre con su cuerpo, que
 * es de donde `mensajeDeError` saca el mensaje real del backend.
 */
@Injectable({ providedIn: 'root' })
export class LiquidacionExternaService {
  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  // ─── Lectura ───────────────────────────────────────────────────────────────

  /** `GET /lqex/getAll` — sincroniza los pagos EN_TESORERIA antes de devolver (contrato §6). */
  getAll(): Observable<LiquidacionExterna[]> {
    return this.http
      .get<LiquidacionExterna[]>(`${ServiciosRhh.RS_LQEX}/getAll`)
      .pipe(catchError(this.handleError));
  }

  /** `GET /lqex/getId/{id}`. */
  getById(id: number): Observable<LiquidacionExterna> {
    return this.http
      .get<LiquidacionExterna>(`${ServiciosRhh.RS_LQEX}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** `POST /lqex/selectByCriteria` — estándar, con sincronización. Sin resultados: `[]` con 200. */
  selectByCriteria(datos: DatosBusqueda[]): Observable<LiquidacionExterna[]> {
    return this.http
      .post<LiquidacionExterna[]>(`${ServiciosRhh.RS_LQEX}/selectByCriteria`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** `GET /lqex/detalle/{id}` — ordenado por `orden` y luego `codigo` (contrato §6). */
  detalle(id: number): Observable<DetalleLiquidacionExterna[]> {
    return this.http
      .get<DetalleLiquidacionExterna[]>(`${ServiciosRhh.RS_LQEX}/detalle/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ─── Escritura ─────────────────────────────────────────────────────────────

  /** `POST /lqex/registrar` — crea la cabecera y los detalles en una transacción. Estado 1. */
  registrar(datos: RegistrarLiquidacionExternaRequest): Observable<LiquidacionExterna> {
    return this.http
      .post<LiquidacionExterna>(`${ServiciosRhh.RS_LQEX}/registrar`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** `PUT /lqex/actualizar` — sólo en REGISTRADA. Reemplaza todos los detalles. */
  actualizar(datos: RegistrarLiquidacionExternaRequest): Observable<LiquidacionExterna> {
    return this.http
      .put<LiquidacionExterna>(`${ServiciosRhh.RS_LQEX}/actualizar`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** `POST /lqex/enviarATesoreria/{id}` — sólo desde REGISTRADA (contrato §4). */
  enviarATesoreria(
    id: number,
    datos: EnviarATesoreriaLiquidacionExternaRequest,
  ): Observable<EnviarATesoreriaLiquidacionExternaResponse> {
    return this.http
      .post<EnviarATesoreriaLiquidacionExternaResponse>(
        `${ServiciosRhh.RS_LQEX}/enviarATesoreria/${id}`,
        datos,
        this.httpOptions,
      )
      .pipe(catchError(this.handleError));
  }

  /** `POST /lqex/sincronizarPago/{id}` (contrato §4). */
  sincronizarPago(id: number): Observable<LiquidacionExterna> {
    return this.http
      .post<LiquidacionExterna>(`${ServiciosRhh.RS_LQEX}/sincronizarPago/${id}`, null, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** `POST /lqex/anular/{id}` — motivo obligatorio (contrato §4/§6). */
  anular(id: number, datos: AnularLiquidacionExternaRequest): Observable<LiquidacionExterna> {
    return this.http
      .post<LiquidacionExterna>(`${ServiciosRhh.RS_LQEX}/anular/${id}`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error.error ?? error);
  }
}
