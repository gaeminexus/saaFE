/**
 * RHH.ODBS — orden de pago de beneficio social (décimos acumulados). Contrato:
 * `docs/rrh/API-PAGO-BENEFICIOS-SOCIALES.md`. Los endpoints todavía no existen en el backend al
 * momento de escribir esto (2026-09-01): estos tipos siguen el contrato congelado, no código real.
 */

/** `ODBSESTD`, rubro `RHH_ESTADO_ORDEN_BENEFICIO`. Ver contrato §2. */
export enum EstadoOrdenBeneficioSocial {
  GENERADA = 1,
  ENVIADA_A_TESORERIA = 2,
  PAGADA = 3,
  ANULADA = 4,
}

export const ESTADO_ORDEN_BENEFICIO_SOCIAL_LABELS: Record<number, string> = {
  1: 'Generada',
  2: 'Enviada a tesorería',
  3: 'Pagada',
  4: 'Anulada',
};

/**
 * `LQBSTPBN` / `ODBSTPBN`, rubro `RHH_TIPO_BENEFICIO_SOCIAL`. La orden de pago solo maneja estos
 * tres (contrato §2) — `4` vacaciones y `5` utilidades existen en el rubro pero son de otros
 * procesos, no de `odbs`.
 */
export enum TipoBeneficioSocial {
  DECIMO_TERCERO = 1,
  DECIMO_CUARTO = 2,
  FONDOS_RESERVA = 3,
}

export const TIPO_BENEFICIO_SOCIAL_LABELS: Record<number, string> = {
  1: 'Décimo tercero',
  2: 'Décimo cuarto',
  3: 'Fondos de reserva',
};

/**
 * Fila de `GET /odbs/listar` (contrato §1.3bis) — es una **proyección**, no la entidad `RHH.ODBS`
 * cruda de `getAll`/`selectByCriteria`. `estadoPago`/`estadoPagoTexto` son los dos campos que
 * permiten distinguir, dentro del mismo `estado = ENVIADA_A_TESORERIA`, la orden que todavía
 * espera aprobación de tesorería de la que ya fue pagada y solo falta contabilizar (trampa §3.2).
 * `estadoPago` es `null` mientras la orden no se envió a tesorería. `numeroEmpleados` es columna
 * persistida (`ODBSNMEM`): confiable también para órdenes viejas, no solo para la recién generada.
 */
export interface OrdenBeneficioSocialListado {
  idOrden: number;
  numero: string;
  tipoBeneficio: number;
  tipoBeneficioTexto: string;
  anio: number;
  region: number | null;
  total: number;
  numeroEmpleados: number;
  /** LocalDate del backend: normalizar con FuncionesDatosService.convertirFechaDesdeBackend(). */
  fechaEmision: unknown;
  fechaPago: unknown;
  estado: number;
  estadoTexto: string;
  idPagoProgramado: number | null;
  estadoPago: number | null;
  estadoPagoTexto: string | null;
  idAsiento: number | null;
}

/** `LQBSESTD`. Ver contrato §2. */
export enum EstadoLiquidacionBeneficioSocial {
  PENDIENTE = 1,
  PAGADA = 2,
}

export const ESTADO_LIQUIDACION_BENEFICIO_SOCIAL_LABELS: Record<number, string> = {
  1: 'Pendiente',
  2: 'Pagada',
};

/** Línea de `detalle[]` de `GET /odbs/detalle/{id}` (contrato §1.3) — una liquidación (`RHH.LQBS`). */
export interface LiquidacionBeneficioSocial {
  idLiquidacion: number;
  idEmpleado: number;
  identificacion: string;
  nombreEmpleado: string;
  fechaInicio: unknown;
  fechaFin: unknown;
  baseCalculo: number;
  dias: number;
  valor: number;
  valorPagado: number;
  /** LQBSESTD: 1 pendiente, 2 pagada. */
  estado: number;
}

/** `GET /odbs/detalle/{id}` (contrato §1.3) — lo que la pantalla muestra al abrir una orden. */
export interface DetalleOrdenBeneficioSocial {
  idOrden: number;
  numero: string;
  tipoBeneficio: number;
  anio: number;
  total: number;
  numeroEmpleados: number;
  estado: number;
  estadoTexto: string;
  idPagoProgramado: number | null;
  estadoPago: number | null;
  fechaPago: unknown;
  idAsiento: number | null;
  detalle: LiquidacionBeneficioSocial[];
}

/** Query params de `GET /odbs/listar` (contrato §1.3bis). Solo `idEmpresa` es obligatorio. */
export interface FiltrosListarOrdenesBeneficioSocial {
  idEmpresa: number;
  anio?: number;
  tipoBeneficio?: number;
  estado?: number;
}

/** Body de `POST /odbs/generar` (contrato §1.2). */
export interface GenerarOrdenBeneficioSocialRequest {
  idEmpresa: number;
  tipoBeneficio: number;
  anio: number;
  /** Solo si `tipoBeneficio = DECIMO_CUARTO`; debe ir `null` en los demás casos (contrato §3.4). */
  region: number | null;
  usuario: string;
}

/**
 * 200 de `POST /odbs/generar`. Manda `exito`, no el status HTTP (contrato §3.1): con
 * `exito: false` no hubo liquidaciones sueltas para agrupar, y en el 409 de orden viva viene
 * además `idOrdenExistente` para poder ofrecer abrirla.
 */
export interface ResultadoGenerarOrdenBeneficioSocial {
  exito: boolean;
  idOrden?: number;
  numero?: string;
  tipoBeneficio?: number;
  tipoBeneficioTexto?: string;
  anio?: number;
  region?: number | null;
  total?: number;
  numeroEmpleados?: number;
  estado?: number;
  estadoTexto?: string;
  idOrdenExistente?: number;
  mensaje: string;
}

/** Body de `POST /odbs/enviarATesoreria/{id}` (contrato §1.4). */
export interface EnviarATesoreriaRequest {
  idUsuario: number;
  observacion: string;
}

/** 200 de `POST /odbs/enviarATesoreria/{id}`. */
export interface ResultadoEnviarATesoreria {
  exito: boolean;
  idOrden: number;
  idPagoProgramado: number;
  estadoPago: number;
  estadoPagoTexto: string;
  mensaje: string;
}

/**
 * Body de `POST /odbs/confirmarPago/{id}` (contrato §1.5). `fechaPago` es `LocalDate`:
 * `yyyy-MM-dd`, nunca un `Date` crudo ni una cadena con `Z` (contrato §0).
 */
export interface ConfirmarPagoOrdenBeneficioSocialRequest {
  fechaPago: string;
  usuario: string;
}

/** 200 de `POST /odbs/confirmarPago/{id}`. */
export interface ResultadoConfirmarPago {
  exito: boolean;
  idOrden: number;
  idAsiento: number;
  numeroAsiento: string;
  liquidacionesPagadas: number;
  total: number;
  mensaje: string;
}

/** Body de `POST /odbs/anular/{id}` (contrato §1.6). `motivo` es obligatorio. */
export interface AnularOrdenBeneficioSocialRequest {
  motivo: string;
  usuario: string;
}
