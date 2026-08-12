import { DetallePrestamo } from './detalle-prestamo';

/**
 * Catálogo de estados de cuota de préstamo (endpoint /rest/escp/getAll).
 */
export interface EstadoCuotaPrestamo {
  /**
   * PK interna del catálogo (ESCPCDGO). NO comparar contra `DetallePrestamo.estado`:
   * es un ID arbitrario que no coincide con el código de negocio.
   */
  codigo: number;
  /** Nombre del estado (ESCPNMBR); es lo que se muestra al usuario. */
  nombre: string;
  /**
   * Código de negocio (ESCPCDAL). Único valor comparable con
   * `DetallePrestamo.estado` (DTPRESTD) y con {@link CodigoEstadoCuota}.
   */
  codigoAlterno: number;
  /** Bandera activo/inactivo de la propia fila del catálogo (1 = vigente). */
  estado: number;
}

/**
 * Códigos de negocio del estado de una cuota (`DetallePrestamo.estado` = DTPRESTD).
 *
 * Contrato vigente: `estado` es la única fuente de verdad. `idEstado` (DTPRIDST)
 * se mantiene como **espejo** del mismo valor por compatibilidad, así que nunca
 * debe leerse para decidir nada — solo escribirse con el mismo número que `estado`
 * (ver {@link construirEstadoCuota}).
 */
export enum CodigoEstadoCuota {
  PENDIENTE = 1,
  ACTIVA = 2,
  EMITIDA = 3,
  PAGADA = 4,
  EN_MORA = 5,
  PARCIAL = 6,
  CANCELADA_ANTICIPADA = 7,
  VENCIDA = 8,
  DE_PLAZO_VENCIDO = 9,
}

/**
 * Nombres de respaldo por código. Se usan cuando el catálogo del backend no está
 * cargado o no trae la fila; si está disponible, preferir siempre el `nombre` del
 * catálogo buscándolo por `codigoAlterno`.
 */
export const NOMBRES_ESTADO_CUOTA: Record<number, string> = {
  [CodigoEstadoCuota.PENDIENTE]: 'Pendiente',
  [CodigoEstadoCuota.ACTIVA]: 'Activa',
  [CodigoEstadoCuota.EMITIDA]: 'Emitida',
  [CodigoEstadoCuota.PAGADA]: 'Pagada',
  [CodigoEstadoCuota.EN_MORA]: 'En mora',
  [CodigoEstadoCuota.PARCIAL]: 'Parcial',
  [CodigoEstadoCuota.CANCELADA_ANTICIPADA]: 'Cancelada anticipada',
  [CodigoEstadoCuota.VENCIDA]: 'Vencida',
  [CodigoEstadoCuota.DE_PLAZO_VENCIDO]: 'De plazo vencido',
};

/** Sufijo de clase CSS por código; las pantallas lo prefijan (`cuota-`, `estado-cuota-`). */
export const CLASES_ESTADO_CUOTA: Record<number, string> = {
  [CodigoEstadoCuota.PENDIENTE]: 'pendiente',
  [CodigoEstadoCuota.ACTIVA]: 'activa',
  [CodigoEstadoCuota.EMITIDA]: 'emitida',
  [CodigoEstadoCuota.PAGADA]: 'pagada',
  [CodigoEstadoCuota.EN_MORA]: 'mora',
  [CodigoEstadoCuota.PARCIAL]: 'parcial',
  [CodigoEstadoCuota.CANCELADA_ANTICIPADA]: 'cancelada',
  [CodigoEstadoCuota.VENCIDA]: 'vencida',
  [CodigoEstadoCuota.DE_PLAZO_VENCIDO]: 'plazo-vencido',
};

/**
 * Código de estado de una cuota. Lee SOLO `estado` (DTPRESTD): `idEstado` es un
 * espejo y no debe usarse como respaldo.
 */
export function obtenerCodigoEstadoCuota(
  detalle: DetallePrestamo | null | undefined,
): number | null {
  if (!detalle || detalle.estado === null || detalle.estado === undefined) return null;
  return Number(detalle.estado);
}

/** Nombre de respaldo del estado; devuelve `null` si el código no está en el catálogo. */
export function obtenerNombreEstadoCuota(codigo: number | null | undefined): string | null {
  return codigo != null ? (NOMBRES_ESTADO_CUOTA[codigo] ?? null) : null;
}

/**
 * Par `{ estado, idEstado }` a enviar al backend. `idEstado` se escribe como
 * espejo exacto de `estado` — no se traduce al PK del catálogo.
 */
export function construirEstadoCuota(codigo: number): { estado: number; idEstado: number } {
  return { estado: codigo, idEstado: codigo };
}
