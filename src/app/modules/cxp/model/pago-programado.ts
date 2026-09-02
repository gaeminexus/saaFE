import { SaldoFactura } from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';

/**
 * Asiento contable tal como llega anidado dentro de un pago. El pago no lo
 * referencia directamente: cuelga de lo que se contabilizó (la aplicación de
 * la factura, el egreso de tesorería o el anticipo).
 */
export interface AsientoDePago {
  codigo: number;
  numeroAlterno?: string | null;
  numero?: number | null;
  estado?: number | null;
}

/**
 * PGTR - Pago Programado. Un pago a proveedor por transferencia, con su
 * ciclo de vida: registrado → en archivo → confirmado/rechazado (o anulado).
 * Registrar un pago NO mueve el saldo de la factura; eso ocurre recién
 * cuando el banco lo confirma (carga de respuesta del lote).
 *
 * Excepción: los pagos por débito automático (`debitoAutomatico = 1`) nacen
 * en estado 3, ya contabilizados, porque el banco debitó la cuenta por
 * convenio antes de que el pago llegue al sistema.
 */
export interface PagoProgramado {
  id: number;
  facturaCompra?: { id: number; numero: string } | null;
  /**
   * Egreso de tesorería sin documento físico (TSR.EGRS) que originó el pago.
   * Viene con `facturaCompra: null`: el concepto del pago es su descripción.
   */
  egreso?: { id: number; descripcion?: string | null; asiento?: AsientoDePago | null } | null;
  /** Anticipo a proveedor (PGS.ANTP) que originó el pago. */
  anticipo?: { id: number; asiento?: AsientoDePago | null } | null;
  /**
   * Aplicación generada al confirmar el pago de una factura; trae el asiento
   * contable. Nula mientras el banco no confirme.
   */
  aplicacion?: { id: number; asiento?: AsientoDePago | null } | null;
  titular?: { codigo: number; nombre: string } | null;
  cuentaBancaria?: { codigo: number; numero: string; banco?: { nombre: string } } | null;
  cuentaDestino?: { id: number; numero: string; banco?: { nombre: string } } | null;
  /** 0 = transferencia normal, 1 = débito automático (no pasa por lote). */
  debitoAutomatico?: number | null;
  /** Ver FormaPagoAplicacion (2 transferencia, 3 cheque, 4 débito automático). */
  formaPago?: number | null;
  /** Solo cuando `formaPago = 3` (cheque). */
  cheque?: { numero: number } | null;
  valor: number;
  fechaProgramada: any;
  /** Ver EstadoPagoProgramado en shared/model/pagos-cobros. */
  estado: number;
  observacion?: string | null;
  usuario?: { codigo: number; nombre: string } | null;
  fechaRegistro?: any;

  // ---- origen externo (§7.1 de docs/crd/PLAN-DEVOLUCION-APORTES.md) ----
  /**
   * Etiqueta opaca del proceso externo que originó el pago (p. ej.
   * `'CRD_DEVOLUCION_APORTE'`); `null`/`undefined` en los pagos propios de
   * CXP. CXP no la resuelve: solo la guarda y la devuelve.
   */
  origenExterno?: string | null;
  /** Id del documento en el módulo origen. Informativo: CXP no lo resuelve. */
  idOrigen?: number | null;
  /**
   * Beneficiario ocasional: se usa cuando `titular` es `null` porque el
   * destinatario no está en el maestro de titulares de TSR.
   */
  beneficiarioNombre?: string | null;
  beneficiarioIdentificacion?: string | null;
  beneficiarioCuenta?: string | null;
  /**
   * Asiento del pago de origen externo. Los demás orígenes cuelgan el suyo de
   * su propio documento (`egreso.asiento`, `anticipo.asiento`,
   * `aplicacion.asiento`); este es el único que va directo en el pago.
   */
  asiento?: AsientoDePago | null;
}

/** Body de POST /pgtr. */
export interface RegistrarPagoRequest {
  idFacturaCompra: number;
  /**
   * Opcional desde el rediseño de aprobación (docs/logica-negocio/pagos/PLAN-REDISENO-APROBACION-PAGOS.md
   * §3.1/§3.2/§7 en saaBE): sin cuenta, el pago nace `POR_APROBAR` y la
   * cuenta + forma de pago se eligen al aprobar en lote (`aprobar()` más
   * abajo), no al registrar. Las pantallas de origen dejaron de pedirla.
   */
  idCuentaBancariaOrigen?: number;
  /** Opcional; si se envía debe ser una cuenta del mismo proveedor de la factura. */
  idCuentaDestinoTitular?: number;
  valor: number;
  fechaProgramada?: string;
  idEmpresa: number;
  idUsuario: number;
  observacion?: string;
  /**
   * true cuando el banco ya debitó la cuenta por convenio: no hace falta la
   * cuenta del titular y el pago se contabiliza en esta misma llamada.
   */
  debitoAutomatico?: boolean;
  /** Nota de débito o número de convenio; solo aplica al débito automático. */
  referencia?: string;
  /** Ver FormaPagoAplicacion (2 transferencia, 3 cheque, 4 débito automático). */
  formaPago?: number;
}

/**
 * Respuesta 201 de POST /pgtr. En una transferencia normal el saldo de la
 * factura todavía no cambia; en un débito automático (`debitoAutomatico`)
 * ya viene abonada, con la aplicación y el asiento generados.
 */
export interface RegistrarPagoResponse extends SaldoFactura {
  exito: boolean;
  mensaje: string;
  pago?: number;
  debitoAutomatico?: boolean;
  /** Solo en débito automático: id de la aplicación creada. */
  aplicacion?: number;
  /** Solo en débito automático: número alterno del asiento contable. */
  asiento?: string;
  /** Solo cuando se pagó con cheque: el número girado. */
  numeroCheque?: number | string;
}

/** Body de POST /pgtr/lote. Todos los pagos deben compartir la cuenta de origen. */
export interface GenerarLoteRequest {
  idsPagos: number[];
  idCuentaOrigen: number;
  idEmpresa: number;
  idUsuario: number;
}

/** Respuesta de POST /pgtr/lote y de GET /pgtr/lote/{id}/archivo. */
export interface LoteGeneradoResponse {
  exito?: boolean;
  mensaje?: string;
  idLote: number;
  nombreArchivo: string;
  /** Texto plano del archivo que se sube al banco; el frontend lo descarga. */
  contenido: string;
  valorTotal?: number;
  numeroPagos?: number;
}

/** Respuesta de POST /pgtr/lote/{id}/respuesta (carga del archivo del banco). */
export interface RespuestaBancoResponse {
  exito: boolean;
  mensaje: string;
  confirmados: number;
  rechazados: number;
  /** Filas del archivo que no se pudieron procesar; hay que investigarlas. */
  errores?: string[];
}

/**
 * Body de POST /pgtr/confirmarManual. Confirma a mano pagos que siguen
 * esperando al banco, con el mismo efecto contable que la respuesta bancaria.
 */
export interface ConfirmarManualRequest {
  idsPagos: number[];
  /** Referencia o N° de transacción del banco; queda en el pago y el asiento. */
  referencia?: string;
  /** Fecha real del pago (yyyy-MM-dd). Es la fecha del asiento contable. */
  fechaPago?: string;
  /** Nota que se agrega a la observación de cada pago. */
  observacion?: string;
  idUsuario: number;
}

/** Respuesta de POST /pgtr/confirmarManual. */
export interface ConfirmarManualResponse {
  exito: boolean;
  mensaje: string;
  confirmados: number;
  /** Pagos que no se pudieron confirmar, con el motivo. */
  errores?: string[];
}

/** Respuesta de POST /pgtr/anular/{id}. */
export interface AnularPagoResponse {
  exito: boolean;
  mensaje: string;
  pago?: number;
}

/**
 * Respuesta de POST /pgtr/revertirConfirmado/{id}. Deshace contabilidad ya
 * generada: el pago queda en estado 4 (Rechazado) y la factura recupera saldo.
 */
export interface RevertirPagoResponse extends SaldoFactura {
  exito: boolean;
  mensaje: string;
  pago?: number;
  aplicacion?: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Aprobación en lote (PLAN-REDISENO-APROBACION-PAGOS.md §3/§7 en saaBE) —
// la solicitud nace sin cuenta ni forma de pago (`POR_APROBAR`); tesorería
// elige cuenta y forma de pago acá, para el lote completo.
// ═══════════════════════════════════════════════════════════════════════

/** Ver OrigenPagoExterno / documentos propios de CXP, §7.1 del plan. */
export type OrigenPago =
  | 'FACTURA_COMPRA'
  | 'EGRESO_TESORERIA'
  | 'ANTICIPO_PROVEEDOR'
  | 'CRD_DEVOLUCION_APORTE'
  | 'TSR_CAJA_CHICA'
  | 'RHH_ANTICIPO_EMPLEADO'
  | 'CXC_DEVOLUCION_CLIENTE';

export const ORIGEN_PAGO_LABELS: Record<OrigenPago, string> = {
  FACTURA_COMPRA: 'Factura de compra',
  EGRESO_TESORERIA: 'Egreso de tesorería',
  ANTICIPO_PROVEEDOR: 'Anticipo a proveedor',
  CRD_DEVOLUCION_APORTE: 'Devolución de aportes',
  TSR_CAJA_CHICA: 'Caja chica',
  RHH_ANTICIPO_EMPLEADO: 'Anticipo a trabajador',
  CXC_DEVOLUCION_CLIENTE: 'Devolución a cliente',
};

/** Fila de GET /pgtr/porAprobar — proyección `PagoPorAprobar`, no la entidad. */
export interface PagoPorAprobar {
  id: number;
  origen: OrigenPago;
  beneficiario: string;
  concepto: string;
  valor: number;
  fechaSolicitada: unknown;
}

/** Query params de GET /pgtr/porAprobar. Solo `idEmpresa` es obligatorio. */
export interface FiltrosPorAprobar {
  idEmpresa: number;
  origen?: OrigenPago;
  desde?: string;
  hasta?: string;
}

/** Body de POST /pgtr/aprobar. `formaPago`: 2 Transferencia, 3 Cheque, 4 Débito automático — 1 Efectivo no se soporta. */
export interface AprobarPagosRequest {
  idsPagos: number[];
  idCuentaBancaria: number;
  formaPago: number;
  /** yyyy-MM-dd. Opcional — vacío/omitido = hoy. */
  fechaPago?: string;
  idUsuario: number;
  /**
   * Solo tiene efecto con `formaPago = CHEQUE`; con cualquier otra forma el
   * backend lo ignora. Por defecto `false` — sin mandarlo, el comportamiento
   * es el de un cheque por pago (docs/tsr/API-UN-CHEQUE-VARIOS-PAGOS.md).
   */
  agruparEnUnCheque?: boolean;
}

/**
 * Una entrada por CHEQUE, no por pago. `pagos` y `asientos` son listas
 * siempre, también cuando el cheque cubre un solo pago (§6 del contrato).
 */
export interface ChequeAprobado {
  numeroCheque: string;
  valor: number;
  pagos: number[];
  asientos: string[];
}

/**
 * Respuesta de POST /pgtr/aprobar. Con transferencia (`formaPago=2`) los
 * pagos quedan en `registrados` y `cheques` no viene. Con cheque
 * (`formaPago=3`) quedan en `confirmados` y `cheques` sí viene — una entrada
 * por cheque, con la lista de pagos que agrupa. Con débito automático
 * (`formaPago=4`) quedan en `confirmados` igual que cheque, pero sin
 * `cheques`.
 */
export interface AprobarPagosResponse {
  exito: boolean;
  idCuentaBancaria: number;
  formaPago: number;
  totalAprobado: number;
  pagosAprobados: number;
  registrados: number[];
  confirmados: number[];
  cheques?: ChequeAprobado[];
  mensaje: string;
}

/**
 * Respuesta de GET /pgtr/disponibilidad/{idCuenta} (§3.3/§7 del plan). `disponible` = `saldo` −
 * `comprometido` (pagos ya aprobados de esa cuenta que aún no confirma el banco). Si el GET falla,
 * no hay valor por defecto razonable: mostrar "desconocida", nunca 0 (mismo criterio que el
 * interruptor de contabilidad de CRD).
 */
export interface DisponibilidadCuenta {
  saldo: number;
  comprometido: number;
  disponible: number;
}

/**
 * Respuesta de GET /pgtr/facturasComprometidas/{idTitular}. `idsFacturas` son las facturas de
 * ese proveedor cuyo saldo pendiente ya está íntegramente comprometido por pagos vigentes
 * (incluye POR_APROBAR, no solo confirmados) — la regla la aplica el servidor, el frontend solo
 * excluye esos ids de los combos de "facturas pendientes por pagar".
 */
export interface FacturasComprometidasResponse {
  idTitular: number;
  idsFacturas: number[];
}
