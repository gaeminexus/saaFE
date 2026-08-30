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

export interface SolicitudRegistroAcuerdo {
  idPrestamo: number;
  /** `yyyy-MM-dd`. MISMA fecha con la que se previsualizó — el backend valida los adeudados contra ella. */
  fecha: string;
  observacion?: string | null;
  usuario: string;
  /** Cuenta de la institución donde entra la parte no condonada. */
  idCuentaBancaria: number;
  referencia: string;
  rutaRespaldo: string;
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
  estado: number;
  /** Calculado por el backend sumando el detalle — nunca se envía al registrar. */
  valorPagar: number;
  /** Calculado por el backend sumando el detalle — nunca se envía al registrar. */
  valorCondonar: number;
  fecha: string | number[] | Date;
  observacion: string | null;
  usuarioRegistro: string | null;
  fechaRegistro: string | number[] | Date | null;
  /** `null` hasta que se procesa el cobro asociado (K11: el préstamo se cancela recién ahí). */
  eventoPrestamo: { codigo: number } | null;
  /** El cobro de `CRD.CBCR` creado en el mismo acto del registro — de ahí sale hacia la bandeja. */
  cobroCredito: CobroCredito;

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
