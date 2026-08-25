import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import {
  AnulacionDevolucionRequest,
  DeudaVigenteParticipe,
  DevolucionListado,
  ResultadoDevolucion,
  ResultadoSincronizacionDevolucion,
  SolicitudDevolucion,
} from '../model/devolucion/devolucion-aporte';
import { RespuestaDevolucion } from '../model/devolucion/respuesta-devolucion';
import { ServiciosCrd } from './ws-crd';

/**
 * Endpoints de devolución de aportes al partícipe (§6 de `docs/crd/PLAN-DEVOLUCION-APORTES.md`).
 *
 * Igual que `OperacionesPagoPrestamoService`, este servicio NUNCA propaga el error de HTTP: el
 * backend devuelve el mismo sobre `{exito, etapa, mensaje, error, resultado}` en 2xx y en 4xx, y
 * el código estable de `error` ES la lógica de pantalla (mandar a cargar la cuenta bancaria,
 * mandar a parametrizar el producto del tipo de aporte, refrescar saldos tras un
 * SALDO_INSUFICIENTE, mandar a Cuentas por Pagar cuando la devolución ya se pagó). Por eso todos
 * los métodos emiten `RespuestaDevolucion` y ninguno lanza: el llamador ramifica por `resp.exito`
 * y después por `resp.error`.
 */
@Injectable({ providedIn: 'root' })
export class DevolucionAporteService {
  private http = inject(HttpClient);

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // ===================== §6.1 Registrar =====================

  /**
   * Registra la devolución: genera las filas negativas en CRD.APRT y dispara la orden de pago en
   * Cuentas por Pagar. Es una sola transacción del lado del backend — si algo falla no queda
   * nada escrito, así que la pantalla no tiene que limpiar nada. Responde 201.
   *
   * ⚠️ `solicitud.fecha` tiene que venir ya como `yyyy-MM-dd` (usar {@link formatearFecha}).
   */
  registrar(solicitud: SolicitudDevolucion): Observable<RespuestaDevolucion<ResultadoDevolucion>> {
    const url = `${ServiciosCrd.RS_DVAP}/registrar`;
    return this.http
      .post<RespuestaDevolucion<ResultadoDevolucion>>(url, this.limpiar(solicitud), this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== §6.2 Historial del partícipe =====================

  /**
   * Devoluciones del partícipe. El backend reconcilia contra el estado real de la orden de pago
   * antes de responder, así que lo que se muestra siempre está al día sin llamar a sincronizar.
   *
   * Una lista vacía es un 200 con `[]`, no un error.
   */
  porEntidad(idEntidad: number): Observable<RespuestaDevolucion<DevolucionListado[]>> {
    const url = `${ServiciosCrd.RS_DVAP}/porEntidad/${idEntidad}`;
    return this.http
      .get<RespuestaDevolucion<DevolucionListado[]>>(url)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== §6.5 Deuda vigente (aviso) =====================

  /**
   * Préstamos sin cancelar del partícipe, para avisar antes de devolverle los aportes.
   *
   * **Es un aviso, no una validación.** `registrar` no consulta esto ni lo rechaza: si el
   * operador confirma con deuda a la vista, la devolución se registra igual, los préstamos no se
   * tocan y nada se netea (§10.2 del plan). La pantalla lo pide al elegir al partícipe y lo
   * muestra en el diálogo de confirmación.
   *
   * Sin préstamos vigentes responde 200 con `totalDeuda: 0`, nunca un error; si aun así la
   * consulta falla, el llamador se queda sin el aviso pero no debe impedir el registro.
   */
  deudaVigente(idEntidad: number): Observable<RespuestaDevolucion<DeudaVigenteParticipe>> {
    const url = `${ServiciosCrd.RS_DVAP}/deudaVigente/${idEntidad}`;
    return this.http
      .get<RespuestaDevolucion<DeudaVigenteParticipe>>(url)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== §6.3 Anular =====================

  /**
   * Anula una devolución que todavía no se pagó: revierte las filas negativas y anula la orden de
   * pago. Solo en estado 1 REGISTRADA o 2 EN_PAGO.
   *
   * Si el pago ya está confirmado el backend responde 409 `DEVOLUCION_YA_PAGADA`: en ese caso el
   * reverso se hace desde Cuentas por Pagar, no desde acá.
   */
  anular(
    idDevolucion: number,
    datos: AnulacionDevolucionRequest
  ): Observable<RespuestaDevolucion<ResultadoDevolucion>> {
    const url = `${ServiciosCrd.RS_DVAP}/anular/${idDevolucion}`;
    return this.http
      .post<RespuestaDevolucion<ResultadoDevolucion>>(url, this.limpiar(datos), this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== §6.4 Sincronizar (recuperación manual) =====================

  /**
   * Reconcilia TODAS las devoluciones pendientes del sistema contra el estado de sus órdenes de
   * pago. Es idempotente y lo mismo lo hace un timer de CRD cada 30 minutos.
   *
   * La pantalla de devolución NO lo expone: es una recuperación global (no por partícipe) y
   * `porEntidad` ya reconcilia lo del partícipe en cada consulta. Queda disponible para una
   * pantalla de administración o para diagnóstico.
   */
  sincronizar(): Observable<RespuestaDevolucion<ResultadoSincronizacionDevolucion>> {
    const url = `${ServiciosCrd.RS_DVAP}/sincronizar`;
    return this.http
      .post<RespuestaDevolucion<ResultadoSincronizacionDevolucion>>(url, null, this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== utilidades =====================

  /**
   * Fecha en `yyyy-MM-dd` armada con los componentes LOCALES de la fecha.
   *
   * No se usa `toISOString()` ni ningún formato con zona: el campo `fecha` de `/dvap/registrar`
   * es un `LocalDate` y el backend serializa con Jackson, que descarta el offset en vez de
   * convertirlo. Un `Date` de las 20:00 en Ecuador se convertiría a `...T01:00:00Z` del día
   * SIGUIENTE y quedaría grabado con la fecha equivocada, en silencio.
   */
  formatearFecha(fecha: Date | string | null | undefined): string | null {
    if (!fecha) return null;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return null;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  /**
   * Quita las claves `null`/`undefined`/`''` para no enviar campos opcionales vacíos. Es una
   * limpieza superficial: `detalle` viaja tal cual.
   *
   * `false` NO se quita: `debitoAutomatico: false` es un valor con significado.
   */
  private limpiar<T extends object>(req: T): T {
    const salida: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(req)) {
      if (valor === null || valor === undefined || valor === '') continue;
      salida[clave] = valor;
    }
    return salida as T;
  }

  /**
   * Convierte el error de HTTP en el mismo sobre que devuelve el backend en 2xx.
   *
   * En 4xx el cuerpo YA es una `RespuestaDevolucion` con el código en `error`: se reusa tal cual y
   * solo se le anota el `httpStatus`. Lo que no trae cuerpo útil (500 sin sobre, red caída,
   * status 0) se normaliza a `ERROR_INTERNO` para que la pantalla siempre tenga un código.
   */
  private normalizarError(e: HttpErrorResponse): RespuestaDevolucion<never> {
    const cuerpo = e.error;
    if (cuerpo && typeof cuerpo === 'object' && 'exito' in cuerpo) {
      return { ...(cuerpo as RespuestaDevolucion<never>), exito: false, httpStatus: e.status };
    }
    return {
      exito: false,
      etapa: 'VALIDACION',
      error: 'ERROR_INTERNO',
      mensaje:
        e.status === 0
          ? 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.'
          : `Error inesperado del servidor (HTTP ${e.status}).`,
      httpStatus: e.status,
    };
  }
}
