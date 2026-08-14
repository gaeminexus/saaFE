import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import {
  AbonoCapitalRequest,
  AnulacionRequest,
  PagoConAportesRequest,
  PagoCuotaRequest,
  PrecancelacionRequest,
  ResultadoAbonoCapital,
  ResultadoAnulacion,
  ResultadoPagoConAportes,
  ResultadoPagoCuota,
  ResultadoPrecancelacion,
  SaldoAporte,
  SimulacionAbonoCapital,
  SimulacionPrecancelacion,
} from '../model/pagos/operaciones-pago';
import { RespuestaPago } from '../model/pagos/respuesta-pago';
import { ServiciosCrd } from './ws-crd';

/**
 * Los 8 endpoints de pago de préstamos documentados en
 * `docs/crd/GUIA-FRONTEND-SERVICIOS-PAGO-PRESTAMOS.md`.
 *
 * A diferencia del resto de servicios del módulo, este NUNCA propaga el error de HTTP: los
 * endpoints de pago devuelven el mismo sobre `{exito, etapa, mensaje, error, resultado}` tanto en
 * 2xx como en 4xx, y el código estable de `error` es justamente lo que las pantallas necesitan
 * para decidir qué hacer (ofrecer precancelación, sugerir otra modalidad, refrescar saldos...).
 * Por eso todos los métodos emiten `RespuestaPago` y nunca lanzan: el llamador solo ramifica por
 * `resp.exito` y, si es false, por `resp.error`.
 */
@Injectable({ providedIn: 'root' })
export class OperacionesPagoPrestamoService {
  private http = inject(HttpClient);

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // ===================== §3 Saldos de aportes =====================

  /**
   * Saldos netos por tipo de aporte vigente del partícipe.
   *
   * Reemplaza a `GET /aprt/getAll` para calcular saldos: `getAll` descarga ~980.000 filas de
   * CRD.APRT y provoca el OutOfMemoryError de WildFly. Acá el agregado lo hace la base de datos.
   *
   * @param idEntidad código del partícipe (ENTD.ENTDCDGO), NO el del préstamo.
   */
  saldosPorEntidad(idEntidad: number): Observable<RespuestaPago<SaldoAporte[]>> {
    const url = `${ServiciosCrd.RS_APRT}/saldosPorEntidad/${idEntidad}`;
    return this.http
      .get<RespuestaPago<SaldoAporte[]>>(url)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== §4 Pago de cuota (efectivo/ventanilla) =====================

  /**
   * Pago de cuota(s) en efectivo. Cubre parcial, exacto y con excedente en cascada con el mismo
   * llamado. Si el valor cubre toda la deuda el préstamo queda CANCELADO (3) — eso está permitido
   * y no es una precancelación (no condona nada).
   */
  pagarCuota(req: PagoCuotaRequest): Observable<RespuestaPago<ResultadoPagoCuota>> {
    const url = `${ServiciosCrd.RS_PRST}/pagarCuota`;
    return this.http
      .post<RespuestaPago<ResultadoPagoCuota>>(url, this.limpiar(req), this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== §5 Pago con aportes =====================

  /**
   * El partícipe paga cuotas con el saldo de sus aportes. Misma cascada y prelación que
   * `pagarCuota`. El valor total es la suma de los renglones de `aportes`; no se envía aparte.
   *
   * Un pago mixto efectivo + aportes de cuotas normales se resuelve con dos llamadas consecutivas
   * (`pagarConAportes` y después `pagarCuota`): solo la precancelación admite el mixto atómico.
   */
  pagarConAportes(req: PagoConAportesRequest): Observable<RespuestaPago<ResultadoPagoConAportes>> {
    const url = `${ServiciosCrd.RS_PRST}/pagarConAportes`;
    return this.http
      .post<RespuestaPago<ResultadoPagoConAportes>>(url, this.limpiar(req), this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== §6-§7 Abono a capital =====================

  /**
   * Simulación previa obligatoria del abono a capital: devuelve la tabla proyectada sin escribir
   * nada. Aplica exactamente las mismas validaciones que el POST, así que si simula bien el POST
   * va a funcionar.
   *
   * @param modalidad 1 = mantiene la cuota y reduce el plazo · 2 = mantiene el plazo y reduce la cuota.
   */
  simularAbonoCapital(
    idPrestamo: number,
    valor: number,
    modalidad: number
  ): Observable<RespuestaPago<SimulacionAbonoCapital>> {
    const url = `${ServiciosCrd.RS_PRST}/simularAbonoCapital/${idPrestamo}`;
    const params = new HttpParams().set('valor', String(valor)).set('modalidad', String(modalidad));
    return this.http
      .get<RespuestaPago<SimulacionAbonoCapital>>(url, { params })
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  /**
   * Aplica el abono a capital y re-amortiza el crédito. Responde 201, no 200.
   *
   * Tras el éxito hay que RECARGAR la tabla de amortización: las cuotas pendientes se movieron a
   * CRD.HDTP y las nuevas tienen códigos distintos, así que cualquier id de cuota cacheado queda
   * inválido.
   */
  abonarCapital(req: AbonoCapitalRequest): Observable<RespuestaPago<ResultadoAbonoCapital>> {
    const url = `${ServiciosCrd.RS_PRST}/abonarCapital`;
    return this.http
      .post<RespuestaPago<ResultadoAbonoCapital>>(url, this.limpiar(req), this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== §8-§9 Precancelación =====================

  /**
   * Simulación previa obligatoria de la precancelación: el POST re-verifica el monto, así que hay
   * que simular primero para saber cuánto cobrar.
   *
   * ⚠️ El valor depende de la fecha de corte porque la mora sigue corriendo: si el usuario tarda
   * en confirmar, hay que volver a simular.
   *
   * @param fecha fecha de corte `yyyy-MM-dd`. Si se omite el backend usa hoy.
   */
  simularPrecancelacion(
    idPrestamo: number,
    fecha?: string | null
  ): Observable<RespuestaPago<SimulacionPrecancelacion>> {
    const url = `${ServiciosCrd.RS_PRST}/simularPrecancelacion/${idPrestamo}`;
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    return this.http
      .get<RespuestaPago<SimulacionPrecancelacion>>(url, { params })
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  /**
   * Cancela el crédito completo antes del plazo. Admite efectivo, aportes o mixto, y es la única
   * operación donde el mixto es atómico.
   *
   * Regla de oro: `valorEfectivo + Σ aportes[].valor` debe ser igual a
   * `valorTotalPrecancelacion` (±0.01), y `fecha` debe ser la misma con la que se simuló.
   */
  precancelar(req: PrecancelacionRequest): Observable<RespuestaPago<ResultadoPrecancelacion>> {
    const url = `${ServiciosCrd.RS_PRST}/precancelar`;
    return this.http
      .post<RespuestaPago<ResultadoPrecancelacion>>(url, this.limpiar(req), this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== §10 Anulación =====================

  /**
   * Reversa una operación completa (los 4 tipos). Se anula el evento, no un pago suelto.
   *
   * Regla LIFO: no se puede anular un evento si hay operaciones posteriores vigentes sobre el
   * mismo préstamo — hay que ir de la más nueva a la más vieja.
   */
  anularOperacion(req: AnulacionRequest): Observable<RespuestaPago<ResultadoAnulacion>> {
    const url = `${ServiciosCrd.RS_PRST}/anularOperacion`;
    return this.http
      .post<RespuestaPago<ResultadoAnulacion>>(url, this.limpiar(req), this.httpOptions)
      .pipe(catchError((e: HttpErrorResponse) => of(this.normalizarError(e))));
  }

  // ===================== utilidades =====================

  /** Formato `yyyy-MM-dd` que exigen todos los campos de fecha de entrada. */
  formatearFecha(fecha: Date | string | null | undefined): string | null {
    if (!fecha) return null;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return null;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  /**
   * Quita las claves `null`/`undefined`/`''` para no enviar campos opcionales vacíos: el backend
   * interpreta una fecha ausente como "hoy", pero una fecha `null` explícita puede llegar a la
   * validación de formato.
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
   * En 4xx el cuerpo YA es un `RespuestaPago` con el código en `error`: se reusa tal cual y solo
   * se le anota el `httpStatus`. Los casos que no traen cuerpo útil (500 sin sobre, red caída,
   * status 0) se normalizan a `ERROR_INTERNO` para que la pantalla siempre tenga un código.
   */
  private normalizarError(e: HttpErrorResponse): RespuestaPago<never> {
    const cuerpo = e.error;
    if (cuerpo && typeof cuerpo === 'object' && 'exito' in cuerpo) {
      return { ...(cuerpo as RespuestaPago<never>), exito: false, httpStatus: e.status };
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
