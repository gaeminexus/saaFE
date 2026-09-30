import { Empresa } from '../../../shared/model/empresa';
import { BancoExterno } from '../../tsr/model/banco-externo.model';
import { ProductoPago } from '../../cxp/model/producto_pago';
import { CausalTerminacion } from './causal-terminacion';

/**
 * Liquidación de un ex-colaborador de la administración anterior — `RHH.LQEX`. Contrato:
 * `docs/rrh/API-LIQUIDACION-EXCOLABORADORES.md`. No es un `Empleado`: la persona nunca se crea
 * como colaborador (D1 del contrato), así que la identificación, apellidos y nombres se escriben
 * a mano en esta misma tabla.
 */

/**
 * `DLEXTPCN`, constantes Java `com.saa.rubros.RhhConceptoLiquidacionExterna` (contrato §5.1) —
 * NO es un catálogo `Rubro` (D5). Ingreso = 1 a 9, descuento = 20 a 23.
 */
export enum TipoConceptoLiquidacionExterna {
  REMUNERACION_PENDIENTE = 1,
  DECIMO_TERCERO = 2,
  DECIMO_CUARTO = 3,
  VACACIONES_NO_GOZADAS = 4,
  FONDOS_RESERVA = 5,
  BONIFICACION_DESAHUCIO = 6,
  INDEMNIZACION_DESPIDO = 7,
  OTRO_INGRESO_GRAVADO = 8,
  OTRO_INGRESO_NO_GRAVADO = 9,
  APORTE_PERSONAL_IESS = 20,
  RETENCION_IMPUESTO_RENTA = 21,
  PRESTAMO_ANTICIPO = 22,
  OTRO_DESCUENTO = 23,
}

export const TIPO_CONCEPTO_LIQUIDACION_EXTERNA_LABELS: Record<number, string> = {
  1: 'Remuneración pendiente',
  2: 'Décimo tercer sueldo',
  3: 'Décimo cuarto sueldo',
  4: 'Vacaciones no gozadas',
  5: 'Fondos de reserva',
  6: 'Bonificación por desahucio',
  7: 'Indemnización por despido',
  8: 'Otro ingreso gravado',
  9: 'Otro ingreso no gravado',
  20: 'Aporte personal IESS',
  21: 'Retención de impuesto a la renta',
  22: 'Préstamo o anticipo',
  23: 'Otro descuento',
};

/** Lista para el combo de la grilla de conceptos, en el orden del contrato §5.1. */
export const OPCIONES_TIPO_CONCEPTO_LIQUIDACION_EXTERNA = Object.entries(
  TIPO_CONCEPTO_LIQUIDACION_EXTERNA_LABELS,
).map(([codigo, texto]) => ({ codigo: Number(codigo), texto }));

export function esIngresoLiquidacionExterna(tipoConcepto: number): boolean {
  return tipoConcepto >= 1 && tipoConcepto <= 9;
}

export function esDescuentoLiquidacionExterna(tipoConcepto: number): boolean {
  return tipoConcepto >= 20 && tipoConcepto <= 23;
}

/** `LQEXESTD`, constantes Java `com.saa.rubros.RhhEstadoLiquidacionExterna` (contrato §5.2). */
export enum EstadoLiquidacionExterna {
  REGISTRADA = 1,
  EN_TESORERIA = 2,
  PAGADA = 3,
  ANULADA = 4,
}

export const ESTADO_LIQUIDACION_EXTERNA_LABELS: Record<number, string> = {
  1: 'Registrada',
  2: 'En tesorería',
  3: 'Pagada',
  4: 'Anulada',
};

/** `RHH.LQEX`. `identificacion` sin espacios: el servicio hace `trim()` (contrato §3). */
export interface LiquidacionExterna {
  codigo: number;
  empresa: Empresa | { codigo: number };
  /** `C` cédula · `P` pasaporte (CHECK del contrato §3). */
  tipoIdentificacion: 'C' | 'P';
  identificacion: string;
  apellidos: string;
  nombres: string;
  cargo: string | null;
  /** `LocalDate` del backend: normalizar con `FuncionesDatosService.convertirFechaDesdeBackend()`. */
  fechaIngreso: unknown;
  /** Idem. Debe ser anterior a 2026-01-01 (D7): el servicio rechaza `>=` esa fecha. */
  fechaSalida: unknown;
  causalTerminacion: CausalTerminacion | { codigo: number } | null;
  ultimaRemuneracion: number | null;
  /** Los tres siguientes los calcula el servidor (contrato §3/§5.1): lo que mande el frontend se ignora. */
  totalIngresos: number;
  totalDescuentos: number;
  neto: number;
  productoPago: ProductoPago | { id: number };
  banco: BancoExterno | { codigo: number } | null;
  /** Alterno del rubro 23 (`RubrosRrh.TIPO_CUENTA_BANCARIA`): 1 ahorro · 2 corriente. */
  tipoCuenta: number | null;
  numeroCuenta: string | null;
  estado: number;
  /** `PGS.PGTR` en Tesorería, sin FK. */
  idPago: number | null;
  /** El asiento del pago, copiado del pago confirmado. */
  idAsiento: number | null;
  /** `LocalDate` = `PagoProgramado.fechaRespuesta`. Decide el año del RDEP (contrato §8). */
  fechaPago: unknown;
  observacion: string | null;
  motivoAnulacion: string | null;
  fechaRegistro?: unknown;
  usuarioRegistro?: string | null;
}

/** `RHH.DLEX` — un concepto de la liquidación. `valor` siempre positivo: el signo lo da el tipo. */
export interface DetalleLiquidacionExterna {
  codigo?: number;
  liquidacion?: { codigo: number };
  tipoConcepto: number;
  descripcion: string | null;
  valor: number;
  orden: number | null;
  fechaRegistro?: unknown;
  usuarioRegistro?: string | null;
}

/** Cuerpo de `POST /lqex/registrar` y `PUT /lqex/actualizar` (contrato §6, cuerpo exacto en §6). */
export interface RegistrarLiquidacionExternaRequest {
  liquidacion: Partial<LiquidacionExterna>;
  detalles: Partial<DetalleLiquidacionExterna>[];
}

/** Cuerpo de `POST /lqex/enviarATesoreria/{id}` (contrato §6). `idUsuario` sale de la sesión. */
export interface EnviarATesoreriaLiquidacionExternaRequest {
  idUsuario: number;
}

/** 200 de `POST /lqex/enviarATesoreria/{id}` (contrato §6). */
export interface EnviarATesoreriaLiquidacionExternaResponse {
  liquidacion: LiquidacionExterna;
  idPago: number;
}

/** Cuerpo de `POST /lqex/anular/{id}` (contrato §6). `motivo` es obligatorio. */
export interface AnularLiquidacionExternaRequest {
  idUsuario: number;
  motivo: string;
}
