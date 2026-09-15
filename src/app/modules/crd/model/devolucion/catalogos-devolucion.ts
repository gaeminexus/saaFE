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
 * A partir de PAGADA (3) el reverso normalmente se hace desde Cuentas por Pagar, no desde acá —
 * salvo la excepción de `puedeAnularse` cuando la orden enlazada ya quedó rechazada/anulada.
 */
export const ESTADOS_DEVOLUCION_ANULABLES: readonly number[] = [
  EstadoDevolucion.REGISTRADA,
  EstadoDevolucion.EN_PAGO,
];

/**
 * Estado de la orden de pago enlazada (CXP, `PGS.PGTR.PGTRESTD`) — espejo de
 * `EstadoPagoProgramado` del backend. Solo importan acá los valores que esta pantalla distingue;
 * el resto del ciclo (POR_APROBAR, REGISTRADO, CONFIRMADO) no cambia nada en la UI de devolución
 * salvo habilitar «Reemitir pago».
 */
export enum EstadoPagoOrden {
  POR_APROBAR = 0,
  REGISTRADO = 1,
  EN_ARCHIVO = 2,
  CONFIRMADO = 3,
  RECHAZADO = 4,
  ANULADO = 5,
}

/**
 * ¿La devolución admite anulación desde esta pantalla?
 *
 * Además de REGISTRADA/EN_PAGO (el dinero no salió del banco), acepta PAGADA cuando la orden de
 * pago enlazada quedó RECHAZADA o ANULADA en tesorería (§5.2 de
 * `docs/crd/API-REEMITIR-PAGO-DEVOLUCION.md`): es la reversión completa explícita. Con la orden
 * todavía CONFIRMADA sigue sin poder anularse — ahí corresponde reversar desde Cuentas por Pagar.
 */
export function puedeAnularse(
  estado: number | null | undefined,
  estadoPago?: number | null
): boolean {
  if (estado == null) return false;
  const e = Number(estado);
  if (ESTADOS_DEVOLUCION_ANULABLES.includes(e)) return true;
  if (e !== EstadoDevolucion.PAGADA || estadoPago == null) return false;
  const ep = Number(estadoPago);
  return ep === EstadoPagoOrden.RECHAZADO || ep === EstadoPagoOrden.ANULADO;
}

export function nombreEstadoDevolucion(estado: number | null | undefined): string {
  if (estado == null) return '—';
  return NOMBRE_ESTADO_DEVOLUCION[Number(estado)] ?? `Estado ${estado}`;
}

/** Tolerancia de comparación de montos que aplica el backend (§8.2 del plan). */
export const TOLERANCIA_DEVOLUCION = 0.01;
