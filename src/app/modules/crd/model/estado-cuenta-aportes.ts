/**
 * Estado de cuenta de aportes por devengo (§4.2 de docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md).
 *
 * El agrupador es siempre el periodo de devengo (a qué mes pertenece el aporte), nunca la fecha
 * de transacción (cuándo entró la plata) — esa solo aparece en el detalle de movimientos.
 */

export type EstadoPeriodoAporte = 'COMPLETO' | 'PARCIAL' | 'SIN APORTE' | 'ANTICIPADO' | 'SIN PERIODO';

/** Un movimiento dentro de un periodo. `valor` viene con signo: nunca se muestra en absoluto. */
export interface MovimientoEstadoCuentaAporte {
  idAporte: number;
  /** Fecha de caja — "Fecha de cobro" en pantalla, distinta del periodo que agrupa. */
  fechaTransaccion: string | number[];
  valor: number;
  tipoMovimiento: number;
  tipoMovimientoTexto: string;
  glosa: string;
}

/** Una fila de la vista principal: un periodo de devengo y un tipo de aporte. */
export interface PeriodoEstadoCuentaAporte {
  /** `yyyy-MM`. `null` = histórico sin devengo o retiro de saldo (bloque "SIN PERIODO"). */
  periodo: string | null;
  idTipoAporte: number;
  nombreTipoAporte: string;
  esperado: number;
  aportado: number;
  /** `max(0, esperado − aportado)`. Es DEUDA, no mora — la mora se calcula aparte. */
  faltante: number;
  estado: EstadoPeriodoAporte;
  movimientos: MovimientoEstadoCuentaAporte[];
}

export interface EstadoCuentaAportes {
  idEntidad: number;
  identificacion: string;
  razonSocial: string;
  periodos: PeriodoEstadoCuentaAporte[];
  totalFaltante: number;
}
