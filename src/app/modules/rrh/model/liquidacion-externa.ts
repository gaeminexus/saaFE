import { Empresa } from '../../../shared/model/empresa';
import { PlanCuenta } from '../../cnt/model/plan-cuenta';
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
 * `DLEXTPCN`, constantes Java `com.saa.rubros.RhhConceptoLiquidacionExterna` (contrato §5.1,
 * **redefinido por REVISIÓN 2026-10-02 §R1** — el documento de Contabilidad cambió el significado
 * de los códigos 2 a 9 y agregó el 10, 11, 24 y 25). NO es un catálogo `Rubro` (D5).
 * Ingreso = 1 a 11, descuento = 20 a 25.
 *
 * ⚠️ Se pudo redefinir sin migración porque `RHH.LQEX` estaba vacía al momento del cambio (R1):
 * no hay ninguna liquidación registrada con el significado viejo de §5.1.
 */
export enum TipoConceptoLiquidacionExterna {
  REMUNERACION_PENDIENTE = 1,
  VACACIONES_NO_GOZADAS = 2,
  DECIMO_TERCERO = 3,
  DECIMO_CUARTO = 4,
  FONDOS_RESERVA = 5,
  BONIFICACION_DESAHUCIO = 6,
  INDEMNIZACION_DESPIDO = 7,
  PARTICIPACION_UTILIDADES = 8,
  COMPENSACION_SALARIO_DIGNO = 9,
  OTRO_INGRESO_GRAVADO = 10,
  OTRO_INGRESO_NO_GRAVADO = 11,
  APORTE_PERSONAL_IESS = 20,
  RETENCION_IMPUESTO_RENTA = 21,
  ANTICIPO_QUINCENA = 22,
  ANTICIPO_REMUNERACION = 23,
  OTROS_CONCEPTOS_POR_COBRAR = 24,
  OTROS_INGRESOS = 25,
}

/** Nombres exactos de la tabla R1 (contrato, REVISIÓN 2026-10-02). */
export const TIPO_CONCEPTO_LIQUIDACION_EXTERNA_LABELS: Record<number, string> = {
  1: 'Remuneración pendiente',
  2: 'Vacaciones no gozadas',
  3: 'Décimo tercer sueldo',
  4: 'Décimo cuarto sueldo',
  5: 'Fondos de reserva',
  6: 'Bonificación por desahucio',
  7: 'Indemnización por despido intempestivo',
  8: 'Participación de utilidades',
  9: 'Compensación económica salario digno',
  10: 'Otro ingreso gravado de IR',
  11: 'Otro ingreso no gravado de IR',
  20: 'Aporte personal al IESS',
  21: 'Retención de impuesto a la renta',
  22: 'Anticipo de quincena',
  23: 'Anticipo de remuneración',
  24: 'Otros conceptos por cobrar',
  25: 'Otros ingresos (uniformes y similares)',
};

/** Lista para el combo de la grilla de conceptos, en el orden de la tabla R1. */
export const OPCIONES_TIPO_CONCEPTO_LIQUIDACION_EXTERNA = Object.entries(
  TIPO_CONCEPTO_LIQUIDACION_EXTERNA_LABELS,
).map(([codigo, texto]) => ({ codigo: Number(codigo), texto }));

/**
 * Cuentas contables sugeridas por concepto (R1, última columna de la tabla), **tal como las
 * escribió el contador** — con y sin puntos, según el concepto. Se resuelven contra
 * `PlanCuenta.cuentaContable` comparando sin puntos (R1): si una sugerida no existe en el plan de
 * la empresa, no se muestra. Los conceptos 20 y 21 quedan con lista vacía a propósito: el contador
 * los dejó «pendientes» («ya se pagó en la planilla»), no hay sugerencia que inventar.
 */
export const CUENTAS_SUGERIDAS_POR_CONCEPTO: Record<number, string[]> = {
  1: ['2501', '430105'],
  2: ['2514', '43019005'],
  3: ['2.5.08', '4.3.01.15.13'],
  4: ['2.5.09', '4.3.01.15.14'],
  5: [],
  6: ['4.3.01.35'],
  7: ['4.3.01.35'],
  8: [],
  9: [],
  10: [],
  11: [],
  20: [],
  21: [],
  22: ['1.4.03.10.01'],
  23: ['1.4.03.10.02'],
  24: ['1.4.03.90'],
  25: ['5.3.90.90'],
};

export function esIngresoLiquidacionExterna(tipoConcepto: number): boolean {
  return tipoConcepto >= 1 && tipoConcepto <= 11;
}

export function esDescuentoLiquidacionExterna(tipoConcepto: number): boolean {
  return tipoConcepto >= 20 && tipoConcepto <= 25;
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
  /**
   * Deja de ser obligatorio (R2 — D4 derogada): cada concepto lleva su propia cuenta
   * (`DetalleLiquidacionExterna.cuentaContable`), así que ya no hace falta una única cuenta por
   * pagar para toda la liquidación. La pantalla ya no lo pide.
   */
  productoPago: ProductoPago | { id: number } | null;
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
  /**
   * `DLEXPLNN` (R1, D4 derogada) — cuenta de MOVIMIENTO de `CNT.PLNN` para este concepto.
   * Opcional para registrar/guardar; obligatoria en todas las filas para enviar a Tesorería.
   */
  cuentaContable?: PlanCuenta | { codigo: number } | null;
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
