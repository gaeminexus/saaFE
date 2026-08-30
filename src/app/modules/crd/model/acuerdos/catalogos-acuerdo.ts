/**
 * Catálogos de los acuerdos de pago con condonación (`CRD.ACCN`).
 * Contrato congelado: docs/crd/API-ACUERDOS-CONDONACION.md.
 */

/** Estado del acuerdo — rubro alterno 247. Ya NO hay REGISTRADO→APROBADO/RECHAZADO (K4 derogada). */
export enum EstadoAcuerdo {
  VIGENTE = 1,
  APLICADO = 2,
  ANULADO = 3,
}

export const NOMBRE_ESTADO_ACUERDO: Record<number, string> = {
  [EstadoAcuerdo.VIGENTE]: 'Vigente',
  [EstadoAcuerdo.APLICADO]: 'Aplicado',
  [EstadoAcuerdo.ANULADO]: 'Anulado',
};

export const CLASE_ESTADO_ACUERDO: Record<number, string> = {
  [EstadoAcuerdo.VIGENTE]: 'est-vigente',
  [EstadoAcuerdo.APLICADO]: 'est-aplicado',
  [EstadoAcuerdo.ANULADO]: 'est-anulado',
};

export const ICONO_ESTADO_ACUERDO: Record<number, string> = {
  [EstadoAcuerdo.VIGENTE]: 'schedule',
  [EstadoAcuerdo.APLICADO]: 'task_alt',
  [EstadoAcuerdo.ANULADO]: 'block',
};

export function nombreEstadoAcuerdo(estado: number | null | undefined): string {
  if (estado == null) return '—';
  return NOMBRE_ESTADO_ACUERDO[Number(estado)] ?? `Estado ${estado}`;
}

/**
 * Concepto del préstamo — rubro alterno 248. Son 5 y siempre van los 5, aunque valgan 0
 * (§1/§2 del contrato). Capital, interés y mora se pueden condonar; los dos seguros no — se pagan
 * al 100%, no son editables en pantalla, y su suma es el PISO del monto a pagar (K3).
 */
export enum ConceptoPrestamo {
  CAPITAL = 1,
  INTERES = 2,
  MORA = 3,
  DESGRAVAMEN = 4,
  SEGURO_INCENDIO = 5,
}

export const NOMBRE_CONCEPTO_PRESTAMO: Record<number, string> = {
  [ConceptoPrestamo.CAPITAL]: 'Capital',
  [ConceptoPrestamo.INTERES]: 'Interés',
  [ConceptoPrestamo.MORA]: 'Mora',
  [ConceptoPrestamo.DESGRAVAMEN]: 'Desgravamen',
  [ConceptoPrestamo.SEGURO_INCENDIO]: 'Seguro de incendio',
};

/** Orden fijo de despliegue: los 5 conceptos, siempre en este orden. */
export const ORDEN_CONCEPTOS: readonly ConceptoPrestamo[] = [
  ConceptoPrestamo.CAPITAL,
  ConceptoPrestamo.INTERES,
  ConceptoPrestamo.MORA,
  ConceptoPrestamo.DESGRAVAMEN,
  ConceptoPrestamo.SEGURO_INCENDIO,
];

/** ¿Este concepto admite condonación? Desgravamen y seguro de incendio: NUNCA (K3). */
export function esCondonable(concepto: ConceptoPrestamo): boolean {
  return concepto !== ConceptoPrestamo.DESGRAVAMEN && concepto !== ConceptoPrestamo.SEGURO_INCENDIO;
}

/**
 * Universo de préstamos que admiten un acuerdo (§4 del contrato / K7 del plan): solo EN_MORA (11)
 * o DE_PLAZO_VENCIDO (8), decidido por `PRSTIDST` (`idEstado` del préstamo) — nunca `estadoPrestamo`.
 * Mismos códigos que `EstadoPrestamoOperativo` de `pagos/catalogos-pago.ts`, no reimportados a
 * propósito: este contrato está congelado por separado del de pagos.
 */
const ESTADOS_PRESTAMO_ADMITEN_ACUERDO: readonly number[] = [8, 11];

export function admiteAcuerdo(idEstado: number | null | undefined): boolean {
  return idEstado != null && ESTADOS_PRESTAMO_ADMITEN_ACUERDO.includes(Number(idEstado));
}

/** Tolerancia de comparación de montos que aplica el backend (mismo criterio que el resto de CRD). */
export const TOLERANCIA_ACUERDO = 0.01;
