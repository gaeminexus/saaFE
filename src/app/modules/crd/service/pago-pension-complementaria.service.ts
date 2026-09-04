import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import {
  PagoPensionComplementaria,
  ResultadoGeneracionPagos,
  ResultadoPrevisualizacionCorrida,
  ResultadoSincronizacion,
  RespuestaPgpc,
} from '../model/pago-pension-complementaria';
import { ServiciosCrd } from './ws-crd';

/**
 * Corrida mensual de pago a jubilados (pensión complementaria). Contrato:
 * docs/crd/API-PAGO-PENSION-COMPLEMENTARIA.md.
 *
 * `generarPagosDelMes` y `sincronizarPagos` NUNCA propagan el error de HTTP: el backend responde
 * el mismo sobre `{exito, mensaje, resultado}` tanto en 2xx como en 4xx (mismo criterio que
 * `OperacionesPagoPrestamoService`), así que ambos métodos emiten `RespuestaPgpc` y solo se
 * ramifica por `resp.exito`. ⛔ Un 200 con `resp.resultado.conError > 0` NO es una corrida
 * limpia: hay que leer `conError`/`errores` del cuerpo, no solo el status HTTP (§6 del contrato).
 *
 * `porPeriodo` y `porEntidad` sí propagan el error de HTTP: no tienen sobre, son un arreglo
 * pelado de la entidad, y un período/entidad sin datos responde `[]`, nunca 404.
 */
@Injectable({ providedIn: 'root' })
export class PagoPensionComplementariaService {
  private http = inject(HttpClient);
  private readonly base = ServiciosCrd.RS_PGPC;

  /**
   * POST /pgpc/generarPagosDelMes — genera los pagos del período para todos los jubilados con
   * `VPPC` activa. Idempotente por pago, pero NO por informe: en una segunda corrida sobre el
   * mismo período los renglones `YA_EXISTIA` vienen recortados y los totales del encabezado dan
   * casi cero (§1 del contrato). La única vez que existe el informe completo es la primera corrida.
   *
   * ⛔ Los cuatro van como QUERY PARAMS, no como body: un POST con cuerpo JSON se rechaza con 400.
   */
  generarPagosDelMes(
    idEmpresa: number,
    anio: number,
    mes: number,
    usuario: string,
  ): Observable<RespuestaPgpc<ResultadoGeneracionPagos>> {
    const params = new HttpParams()
      .set('idEmpresa', idEmpresa)
      .set('anio', anio)
      .set('mes', mes)
      .set('usuario', usuario);
    return this.http
      .post<RespuestaPgpc<ResultadoGeneracionPagos>>(`${this.base}/generarPagosDelMes`, null, { params })
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  /**
   * POST /pgpc/previsualizarCorrida — simula `generarPagosDelMes` con los mismos parámetros.
   * ⛔ NO ESCRIBE NADA: cero filas, cero asientos, cero órdenes (§4bis del contrato). Reutiliza la
   * misma función que calcula el tope en la corrida real, así que el número no se desincroniza —
   * pero es una ESTIMACIÓN: topa en agregado, no por préstamo y mes a mes como la corrida real, y
   * no simula mora/interés. Con un solo préstamo por jubilado coincide con el resultado real; con
   * dos o más puede diferir. Mostrar el `mensaje` del sobre tal cual — es el texto oficial de esa
   * advertencia, no inventar uno propio.
   */
  previsualizarCorrida(
    idEmpresa: number,
    anio: number,
    mes: number,
    usuario: string,
  ): Observable<RespuestaPgpc<ResultadoPrevisualizacionCorrida>> {
    const params = new HttpParams()
      .set('idEmpresa', idEmpresa)
      .set('anio', anio)
      .set('mes', mes)
      .set('usuario', usuario);
    return this.http
      .post<RespuestaPgpc<ResultadoPrevisualizacionCorrida>>(`${this.base}/previsualizarCorrida`, null, { params })
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  /**
   * POST /pgpc/sincronizarPagos — sin parámetros ni cuerpo. Reconciliador: lee el estado real de
   * la orden en CXP de cada `PGPC` pendiente y lo cierra como PAGADA o RECHAZADA.
   *
   * ⚠ Un rechazo revierte solo el tramo que salía al banco: el cruce contra el préstamo no se
   * deshace (§2 del contrato).
   */
  sincronizarPagos(): Observable<RespuestaPgpc<ResultadoSincronizacion>> {
    return this.http
      .post<RespuestaPgpc<ResultadoSincronizacion>>(`${this.base}/sincronizarPagos`, null)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  /**
   * GET /pgpc/porPeriodo?anio=&mes= — arreglo pelado de `PagoPensionComplementaria` del período,
   * ordenado por partícipe. `[]` si no hay pagos, nunca 404. Es la única forma de recuperar el
   * informe del mes si el operador cerró la pantalla después de `generarPagosDelMes` (§1 y §4).
   */
  porPeriodo(anio: number, mes: number): Observable<PagoPensionComplementaria[]> {
    const params = new HttpParams().set('anio', anio).set('mes', mes);
    return this.http
      .get<PagoPensionComplementaria[]>(`${this.base}/porPeriodo`, { params })
      .pipe(catchError((e: HttpErrorResponse) => throwError(() => this.extraerMensajeError(e))));
  }

  /**
   * GET /pgpc/porEntidad/{idEntidad} — historial de un jubilado, del más reciente al más antiguo.
   * Arreglo pelado de la entidad. ⛔ NO trae `valorCruzadoAPrestamo`, `valorOrdenPago` ni
   * `generoOrdenPago`: esos campos solo existen en el DTO de la corrida (§3 del contrato).
   */
  porEntidad(idEntidad: number): Observable<PagoPensionComplementaria[]> {
    return this.http
      .get<PagoPensionComplementaria[]>(`${this.base}/porEntidad/${idEntidad}`)
      .pipe(catchError((e: HttpErrorResponse) => throwError(() => this.extraerMensajeError(e))));
  }

  // ===================== manejo de errores =====================

  /**
   * Convierte el error de HTTP en el mismo sobre que devuelve el backend en 2xx, igual criterio
   * que `OperacionesPagoPrestamoService.normalizarError`.
   */
  private normalizarError(e: HttpErrorResponse): RespuestaPgpc<never> {
    const cuerpo = e.error;
    if (cuerpo && typeof cuerpo === 'object' && 'exito' in cuerpo) {
      return { ...(cuerpo as RespuestaPgpc<never>), exito: false };
    }
    return {
      exito: false,
      error: 'ERROR_INTERNO',
      mensaje:
        e.status === 0
          ? 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.'
          : `Error inesperado del servidor (HTTP ${e.status}).`,
    };
  }

  private extraerMensajeError(e: HttpErrorResponse): string {
    const cuerpo: unknown = e?.error;
    if (cuerpo && typeof cuerpo === 'object' && typeof (cuerpo as { mensaje?: unknown }).mensaje === 'string') {
      return (cuerpo as { mensaje: string }).mensaje;
    }
    if (typeof cuerpo === 'string' && cuerpo.trim()) {
      return cuerpo;
    }
    return e.status === 0
      ? 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.'
      : `Error inesperado del servidor (HTTP ${e.status}).`;
  }
}
