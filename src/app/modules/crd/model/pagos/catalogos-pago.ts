/**
 * Catálogos de estados que usan los servicios de pago de préstamos
 * (§2 de docs/crd/GUIA-FRONTEND-SERVICIOS-PAGO-PRESTAMOS.md).
 */

/** Estado de la cuota — campo `estado` de DTPR. */
export enum EstadoCuota {
  PENDIENTE = 1,
  ACTIVA = 2,
  EMITIDA = 3,
  PAGADA = 4,
  EN_MORA = 5,
  PARCIAL = 6,
  CANCELADA_ANTICIPADA = 7,
  VENCIDA = 8,
}

export const NOMBRE_ESTADO_CUOTA: Record<number, string> = {
  [EstadoCuota.PENDIENTE]: 'Pendiente',
  [EstadoCuota.ACTIVA]: 'Activa',
  [EstadoCuota.EMITIDA]: 'Emitida',
  [EstadoCuota.PAGADA]: 'Pagada',
  [EstadoCuota.EN_MORA]: 'En mora',
  [EstadoCuota.PARCIAL]: 'Parcial',
  [EstadoCuota.CANCELADA_ANTICIPADA]: 'Cancelada anticipada',
  [EstadoCuota.VENCIDA]: 'Vencida',
};

/**
 * Clase CSS asociada a cada estado de cuota, para que todas las pantallas del módulo pinten los
 * mismos colores. Los estilos viven en `crd/dialog/pagos/pagos-shared.scss` (selector `.pg-badge`).
 */
export const CLASE_ESTADO_CUOTA: Record<number, string> = {
  [EstadoCuota.PENDIENTE]: 'est-pendiente',
  [EstadoCuota.ACTIVA]: 'est-pendiente',
  [EstadoCuota.EMITIDA]: 'est-pendiente',
  [EstadoCuota.PAGADA]: 'est-pagada',
  [EstadoCuota.EN_MORA]: 'est-mora',
  [EstadoCuota.PARCIAL]: 'est-parcial',
  [EstadoCuota.CANCELADA_ANTICIPADA]: 'est-anticipada',
  [EstadoCuota.VENCIDA]: 'est-mora',
};

/**
 * Estado operativo del préstamo — campo `idEstado` de PRST.
 * ⚠️ El estado operativo está en `idEstado`, NO en `estadoPrestamo`.
 */
export enum EstadoPrestamoOperativo {
  GENERADO = 1,
  VIGENTE = 2,
  CANCELADO = 3,
  CANCELADO_ANTICIPADO = 4,
  CANCELADO_POR_NOVACION = 5,
  DE_PLAZO_VENCIDO = 8,
  EN_MORA = 11,
}

export const NOMBRE_ESTADO_PRESTAMO: Record<number, string> = {
  [EstadoPrestamoOperativo.GENERADO]: 'Generado',
  [EstadoPrestamoOperativo.VIGENTE]: 'Vigente',
  [EstadoPrestamoOperativo.CANCELADO]: 'Cancelado',
  [EstadoPrestamoOperativo.CANCELADO_ANTICIPADO]: 'Cancelado anticipado',
  [EstadoPrestamoOperativo.CANCELADO_POR_NOVACION]: 'Cancelado por novación',
  [EstadoPrestamoOperativo.DE_PLAZO_VENCIDO]: 'De plazo vencido',
  [EstadoPrestamoOperativo.EN_MORA]: 'En mora',
};

/** Estados terminales: el préstamo no admite ninguna operación de pago. */
export const ESTADOS_PRESTAMO_TERMINALES: readonly number[] = [
  EstadoPrestamoOperativo.CANCELADO,
  EstadoPrestamoOperativo.CANCELADO_ANTICIPADO,
  EstadoPrestamoOperativo.CANCELADO_POR_NOVACION,
];

/** ¿El préstamo admite operaciones de pago? */
export function admiteOperaciones(idEstado: number | null | undefined): boolean {
  return idEstado != null && !ESTADOS_PRESTAMO_TERMINALES.includes(Number(idEstado));
}

/** Tipo de operación registrada en EventoPrestamo. */
export type TipoOperacionPago = 'PAGO_MANUAL' | 'PAGO_APORTES' | 'ABONO_CAPITAL' | 'PRECANCELACION';

export const NOMBRE_TIPO_OPERACION: Record<string, string> = {
  PAGO_MANUAL: 'Pago de cuota',
  PAGO_APORTES: 'Pago con aportes',
  ABONO_CAPITAL: 'Abono a capital',
  PRECANCELACION: 'Precancelación',
  REGISTRO_APORTE: 'Registro de aporte',
};

export const ICONO_TIPO_OPERACION: Record<string, string> = {
  PAGO_MANUAL: 'payments',
  PAGO_APORTES: 'savings',
  ABONO_CAPITAL: 'trending_down',
  PRECANCELACION: 'task_alt',
  REGISTRO_APORTE: 'account_balance_wallet',
};

/** Modalidad de recálculo del abono a capital. */
export enum ModalidadAbono {
  /** Mantiene el valor de la cuota y reduce el plazo. */
  REDUCIR_PLAZO = 1,
  /** Mantiene el plazo y reduce el valor de la cuota. */
  REDUCIR_CUOTA = 2,
}

/** Tipo de amortización del préstamo (lo define el préstamo, no el usuario). */
export const NOMBRE_TIPO_AMORTIZACION: Record<number, string> = {
  1: 'Francesa',
  2: 'Alemana',
};

/** Tolerancia de comparación que aplica el backend en todas las validaciones de monto. */
export const TOLERANCIA_MONTO = 0.01;
