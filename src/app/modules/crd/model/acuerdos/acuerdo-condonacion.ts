import { CuentaBancaria } from '../../../tsr/model/cuenta-bancaria';
import { CobroCredito } from '../cobros/cobro-credito';
import { Entidad } from '../entidad';
import { Prestamo } from '../prestamo';
import { ConceptoPrestamo } from './catalogos-acuerdo';

/**
 * Modelos de los acuerdos de pago con condonación (`CRD.ACCN`).
 * Contrato congelado: docs/crd/API-ACUERDOS-CONDONACION.md.
 *
 * ⚠️ No agregar campos a `SolicitudRegistroAcuerdo` que no estén en el contrato:
 * `FAIL_ON_UNKNOWN_PROPERTIES` activo, HTTP 400 si sobra una clave.
 */

// ══════════════ GET /accn/previsualizar/{idPrestamo} — el control ══════════════

/**
 * Los 5 conceptos pendientes del préstamo, con la mora recalculada A LA FECHA pedida (no la
 * persistida). Solo lectura, no registra nada. Es lo que reemplaza a la aprobación de un segundo
 * usuario (K4 derogada): hay que mostrarlo completo, los 5 conceptos, nunca un resumen colapsado.
 */
export interface DesgloseConceptosPrestamo {
  idPrestamo: number;
  /** `yyyy-MM-dd`. La misma que se manda al registrar — si difiere, los adeudados no corresponden. */
  fecha: string;
  capitalPendiente: number;
  interesPendiente: number;
  moraPendiente: number;
  /** No condonable — se paga al 100%. */
  desgravamenPendiente: number;
  /** No condonable — se paga al 100%. */
  seguroIncendioPendiente: number;
}

// ══════════════ POST /accn/registrar ══════════════

/** Un renglón del detalle: `valorPagado + valorCondonado` debe cubrir EXACTO `valorAdeudado`. */
export interface DetalleAcuerdoCondonacion {
  concepto: ConceptoPrestamo;
  valorAdeudado: number;
  valorPagado: number;
  valorCondonado: number;
}

/** Renglón de `aportes`: de qué tipo de aporte del socio sale, y cuánto (se CONSUME — el saldo baja). */
export interface AporteAcuerdoCondonacion {
  idTipoAporte: number;
  valor: number;
}

/**
 * El monto a pagar (agregado 2026-08-30) sale de DOS fuentes que deben sumar exacto `valorPagar`
 * del detalle (tolerancia $0.01): cruce de saldos de aportes del socio, y depósito/transferencia.
 *
 * ⚠️ `idCuentaBancaria`/`referencia`/`rutaRespaldo` son CONDICIONALES a `valorPagarDeposito`:
 * obligatorios si es `> 0`, y el backend los RECHAZA si es `0` — no se mandan en absoluto (ni
 * vacíos ni null) cuando el pago es 100% con aportes.
 *
 * ⚠️ Cuál fuente se usa cambia CUÁNDO se aplica el acuerdo (§3 del contrato):
 * - `valorPagarDeposito > 0`: crea un `CBCR` por ESE monto (no por `valorPagar`); el acuerdo queda
 *   VIGENTE esperando aprobación de contabilidad — el préstamo no se toca todavía.
 * - `valorPagarDeposito = 0` (100% aportes): no hay `CBCR` ni aprobación — se aplica EN EL ACTO del
 *   registro y vuelve ya APLICADO, préstamo cancelado, `cobroCredito: null`.
 *
 * ⚠️ `idEmpresa` es OBLIGATORIO siempre, con y sin depósito (agregado 2026-08-30) — no se deriva de
 * nada más porque un acuerdo 100% con aportes no tiene cobro del cual sacarla. Se toma de la
 * sesión (`empresaSesionCodigo()`), nunca se le pide al operador. Si se manda depósito, tiene que
 * ser la misma empresa de `idCuentaBancaria` — si difieren, el backend rechaza el registro.
 */
export interface SolicitudRegistroAcuerdo {
  idPrestamo: number;
  idEmpresa: number;
  /** `yyyy-MM-dd`. MISMA fecha con la que se previsualizó — el backend valida los adeudados contra ella. */
  fecha: string;
  observacion?: string | null;
  usuario: string;

  /** Fuente 1: cruce con saldos de aportes del socio (se consumen). */
  valorPagarAportes: number;
  aportes: AporteAcuerdoCondonacion[];

  /** Fuente 2: depósito/transferencia. `0` si el pago es 100% con aportes. */
  valorPagarDeposito: number;
  /** Cuenta de la institución donde entra la parte en depósito. Solo si `valorPagarDeposito > 0`. */
  idCuentaBancaria?: number;
  referencia?: string;
  rutaRespaldo?: string;

  /** Los 5 conceptos, siempre, en el orden de `ORDEN_CONCEPTOS`. */
  detalles: DetalleAcuerdoCondonacion[];
}

// ══════════════ Lectura ══════════════

/**
 * Entidad `AcuerdoCondonacion` completa (respuesta de `registrar`, HTTP 201, y cabecera de `getId`).
 *
 * ⚠️ `usuarioRechazo`/`fechaRechazo`/`motivoRechazo` significan ANULACIÓN, no rechazo — nombre
 * heredado de un diseño derogado (K10). Un acuerdo nunca se rechaza; se llenan solo cuando se anula
 * el `cobroCredito` asociado. `usuarioAprobacion`/`fechaAprobacion` están sin uso, siempre `null`
 * (K4 derogada) — no se muestran en esta pantalla.
 */
export interface AcuerdoCondonacion {
  codigo: number;
  entidad: Entidad;
  prestamo: Prestamo;
  /** `1` VIGENTE (con depósito, esperando proceso) o `2` APLICADO (100% aportes, ya aplicado). */
  estado: number;
  /** Calculado por el backend sumando el detalle — nunca se envía al registrar. */
  valorPagar: number;
  /** Parte de `valorPagar` cubierta con saldos de aportes del socio. */
  valorPagarAportes: number;
  /** Parte de `valorPagar` cubierta con depósito/transferencia. `0` si fue 100% aportes. */
  valorPagarDeposito: number;
  /** Calculado por el backend sumando el detalle — nunca se envía al registrar. */
  valorCondonar: number;
  fecha: string | number[] | Date;
  observacion: string | null;
  usuarioRegistro: string | null;
  fechaRegistro: string | number[] | Date | null;
  /** `null` hasta que se procesa el cobro asociado (K11: el préstamo se cancela recién ahí). */
  eventoPrestamo: { codigo: number } | null;
  /** El cobro de `CRD.CBCR`, creado solo si hubo depósito (`valorPagarDeposito > 0`). */
  cobroCredito: CobroCredito | null;

  /** ⚠️ Es ANULACIÓN, no rechazo — ver comentario de la interfaz. */
  usuarioRechazo?: string | null;
  /** ⚠️ Es ANULACIÓN, no rechazo. */
  fechaRechazo?: string | number[] | Date | null;
  /** ⚠️ Es el motivo de ANULACIÓN, no de rechazo. */
  motivoRechazo?: string | null;
}

/** `GET /accn/getId/{id}`. */
export interface RespuestaAcuerdoDetalle {
  cabecera: AcuerdoCondonacion;
  detalle: DetalleAcuerdoCondonacion[];
}
