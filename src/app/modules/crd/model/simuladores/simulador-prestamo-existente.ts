import { CuotaProyectada } from '../pagos/operaciones-pago';

/**
 * Contrato de `POST /rest/prst/simularReestructuracion` — canónico, fijado por el árbitro en la
 * §7.1 de `docs/crd/PLAN-SIMULADORES-PRESTAMOS.md` el 2026-08-25. Manda la forma del backend
 * (`ejb/crd/service/dto/ResultadoSimulacionReestructuracion.java`), no la que el FE había inferido
 * antes de leer esa sección — no volver a adivinar nombres de campo sobre este endpoint.
 *
 * Las cuatro palancas de reestructuración (decisión 2 del plan) son combinables:
 * - `capitalizarVencido`: suma la mora y el interés vencido pendientes al capital de arranque.
 * - `nuevaTasaAnual`: `null` = mantener la tasa actual del préstamo.
 * - `nuevoPlazo`: `null` = mantener el plazo actual (la cantidad de cuotas PENDIENTES hoy, no el
 *   plazo original del préstamo — §11.8.3 del plan).
 * - `mesesGracia`: período de gracia antes del primer vencimiento nuevo. Solo `0` o `1`: la
 *   calculadora no soporta gracia multi-mes (`GRACIA_NO_SOPORTADA`, 422).
 */
export interface ParametrosReestructuracion {
  idPrestamo: number;
  capitalizarVencido: boolean;
  /** `null` = mantener la tasa actual del préstamo. */
  nuevaTasaAnual: number | null;
  /** `null` = mantener el plazo actual (cuotas pendientes hoy). */
  nuevoPlazo: number | null;
  mesesGracia: number;
}

/**
 * Comparativa antes/después de la reestructuración (§7.1 del plan).
 *
 * ⚠️ `totalAPagarActual` incluye SIEMPRE la mora y el interés vencido pendientes, se capitalicen
 * o no: si `capitalizarVencido` es `false` esa deuda no entra a la tabla nueva, pero tampoco
 * desaparece. Mostrarla sin aclarar esto haría leer como "ahorro" una plata que el socio sigue
 * debiendo.
 *
 * `tasaActual`, `tasaNueva` y `mesesGracia` los agrega el backend en la fase 2b — todavía pueden
 * no venir en la respuesta; opcionales a propósito, nunca asumir que están.
 */
export interface ResultadoSimulacionReestructuracion {
  idPrestamo: number;
  /** 1 = Francesa · 2 = Alemana (mismo literal que `ParametrosAmortizacion.tipoAmortizacion`). */
  tipoAmortizacion: number;
  /** Σ(capital − capitalPagado) de las cuotas no liquidadas, vencidas o no. */
  saldoCapitalPendiente: number;
  capitalizarVencido: boolean;
  /** Desglosado a propósito (§7.1): el socio ve de qué se compone lo capitalizado. No sumar. */
  moraCapitalizada: number;
  interesVencidoCapitalizado: number;
  /** Capital con el que arranca la tabla nueva: `saldoCapitalPendiente` (+ lo capitalizado). */
  capitalDeArranque: number;
  /** Fase 2b — puede no venir todavía. */
  tasaActual?: number;
  /** Fase 2b — puede no venir todavía. */
  tasaNueva?: number;
  plazoActual: number;
  plazoNuevo: number;
  cuotaActual: number;
  cuotaNueva: number;
  /** Fase 2b — puede no venir todavía. */
  mesesGracia?: number;
  /** Incluye mora e interés vencido pendientes SIEMPRE, se capitalicen o no. Ver el aviso de arriba. */
  totalAPagarActual: number;
  totalAPagarNuevo: number;
  tablaProyectada: CuotaProyectada[];
}
