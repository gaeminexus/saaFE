/**
 * Catálogos del circuito de cobros de crédito con aprobación de contabilidad
 * (docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md).
 */

/** Estado del cobro — campo `estado` de CRD.CBCR (rubro alterno 246). */
export enum EstadoCobro {
  REGISTRADO = 1,
  APROBADO = 2,
  PROCESADO = 3,
  RECHAZADO = 4,
  ANULADO = 5,
}

export const NOMBRE_ESTADO_COBRO: Record<number, string> = {
  [EstadoCobro.REGISTRADO]: 'Registrado',
  [EstadoCobro.APROBADO]: 'Aprobado',
  [EstadoCobro.PROCESADO]: 'Procesado',
  [EstadoCobro.RECHAZADO]: 'Rechazado',
  [EstadoCobro.ANULADO]: 'Anulado',
};

export const CLASE_ESTADO_COBRO: Record<number, string> = {
  [EstadoCobro.REGISTRADO]: 'est-registrado',
  [EstadoCobro.APROBADO]: 'est-aprobado',
  [EstadoCobro.PROCESADO]: 'est-procesado',
  [EstadoCobro.RECHAZADO]: 'est-rechazado',
  [EstadoCobro.ANULADO]: 'est-anulado',
};

export const ICONO_ESTADO_COBRO: Record<number, string> = {
  [EstadoCobro.REGISTRADO]: 'schedule',
  [EstadoCobro.APROBADO]: 'check_circle',
  [EstadoCobro.PROCESADO]: 'task_alt',
  [EstadoCobro.RECHAZADO]: 'report',
  [EstadoCobro.ANULADO]: 'block',
};

export function nombreEstadoCobro(estado: number | null | undefined): string {
  if (estado == null) return '—';
  return NOMBRE_ESTADO_COBRO[Number(estado)] ?? `Estado ${estado}`;
}

/** Estados en los que CRÉDITO todavía puede anular (§1 del contrato: 1, 2 y 4 — nunca 3 ni 5, terminales). */
export const ESTADOS_COBRO_ANULABLES: readonly number[] = [
  EstadoCobro.REGISTRADO,
  EstadoCobro.APROBADO,
  EstadoCobro.RECHAZADO,
];

export function puedeAnularseCobro(estado: number | null | undefined): boolean {
  return estado != null && ESTADOS_COBRO_ANULABLES.includes(Number(estado));
}

/**
 * Tipo de operación del cobro — campo `tipoOperacion` (rubro alterno 245).
 *
 * `ACUERDO_CONDONACION` NO se incluye a propósito: existe en el catálogo del backend pero la rama
 * de `procesarCobro()` todavía no está construida y sus tablas no existen en producción (§7 del
 * contrato). No ofrecerlo en ninguna pantalla hasta que el backend avise que ya es operativo.
 */
export type TipoOperacionCobro = 'PAGO_CUOTA' | 'PAGO_MULTIPLE' | 'ABONO_CAPITAL' | 'PRECANCELACION' | 'REGISTRO_APORTE';

export const NOMBRE_TIPO_OPERACION_COBRO: Record<string, string> = {
  PAGO_CUOTA: 'Pago de cuota',
  PAGO_MULTIPLE: 'Pago de varios préstamos',
  ABONO_CAPITAL: 'Abono a capital',
  PRECANCELACION: 'Precancelación',
  REGISTRO_APORTE: 'Registro de aporte',
  ACUERDO_CONDONACION: 'Acuerdo con condonación',
};

export function nombreTipoOperacionCobro(tipo: string | null | undefined): string {
  if (!tipo) return '—';
  return NOMBRE_TIPO_OPERACION_COBRO[tipo] ?? tipo;
}

/**
 * `modalidad` del detalle (solo `ABONO_CAPITAL`, obligatoria ahí, rechazada en los demás tipos).
 * Mismos valores que `ModalidadAbono` de `pagos/catalogos-pago.ts` — no se reimporta desde acá
 * para no acoplar el circuito nuevo al viejo; los números están congelados en el contrato.
 */
export const MODALIDAD_REDUCIR_PLAZO = 1;
export const MODALIDAD_REDUCIR_CUOTA = 2;

/** Tipo de fila de la bandeja combinada de contabilidad (§5.1 del contrato). */
export type TipoFilaBandejaAprobacion = 'COBRO_CREDITO' | 'CARGA_PETRO';
