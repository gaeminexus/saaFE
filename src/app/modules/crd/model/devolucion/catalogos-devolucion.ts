/**
 * Catálogos de la devolución de aportes
 * (§4.6 y §6 de `docs/crd/PLAN-DEVOLUCION-APORTES.md`).
 */

/**
 * Estado de la devolución — campo `DVAPESTD` de CRD.DVAP.
 *
 * El ciclo lo mueve el reconciliador de CRD leyendo el estado de la orden de pago de CXP
 * (`PGS.PGTR`): CXP nunca avisa, CRD consulta. Por eso una devolución puede quedar en 2 EN_PAGO
 * hasta que el pago se confirme en Cuentas por Pagar.
 */
export enum EstadoDevolucion {
  REGISTRADA = 1,
  EN_PAGO = 2,
  PAGADA = 3,
  RECHAZADA = 4,
  ANULADA = 5,
}

export const NOMBRE_ESTADO_DEVOLUCION: Record<number, string> = {
  [EstadoDevolucion.REGISTRADA]: 'Registrada',
  [EstadoDevolucion.EN_PAGO]: 'En pago',
  [EstadoDevolucion.PAGADA]: 'Pagada',
  [EstadoDevolucion.RECHAZADA]: 'Rechazada',
  [EstadoDevolucion.ANULADA]: 'Anulada',
};

/** Clase CSS del chip de estado. Los estilos viven en `devolucion-aportes.component.scss`. */
export const CLASE_ESTADO_DEVOLUCION: Record<number, string> = {
  [EstadoDevolucion.REGISTRADA]: 'est-registrada',
  [EstadoDevolucion.EN_PAGO]: 'est-en-pago',
  [EstadoDevolucion.PAGADA]: 'est-pagada',
  [EstadoDevolucion.RECHAZADA]: 'est-rechazada',
  [EstadoDevolucion.ANULADA]: 'est-anulada',
};

export const ICONO_ESTADO_DEVOLUCION: Record<number, string> = {
  [EstadoDevolucion.REGISTRADA]: 'edit_note',
  [EstadoDevolucion.EN_PAGO]: 'hourglass_top',
  [EstadoDevolucion.PAGADA]: 'task_alt',
  [EstadoDevolucion.RECHAZADA]: 'report',
  [EstadoDevolucion.ANULADA]: 'block',
};

/**
 * Estados en los que la devolución todavía se puede anular: el dinero no salió del banco.
 * A partir de PAGADA (3) el reverso se hace desde Cuentas por Pagar, no desde acá.
 */
export const ESTADOS_DEVOLUCION_ANULABLES: readonly number[] = [
  EstadoDevolucion.REGISTRADA,
  EstadoDevolucion.EN_PAGO,
];

/** ¿La devolución admite anulación desde esta pantalla? */
export function puedeAnularse(estado: number | null | undefined): boolean {
  return estado != null && ESTADOS_DEVOLUCION_ANULABLES.includes(Number(estado));
}

export function nombreEstadoDevolucion(estado: number | null | undefined): string {
  if (estado == null) return '—';
  return NOMBRE_ESTADO_DEVOLUCION[Number(estado)] ?? `Estado ${estado}`;
}

/** Tolerancia de comparación de montos que aplica el backend (§8.2 del plan). */
export const TOLERANCIA_DEVOLUCION = 0.01;
