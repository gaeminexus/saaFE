import { DesgloseAporte, MovimientoAporte } from './respuesta-pago';

/**
 * Contratos de request/resultado de los 8 endpoints de pago de préstamos
 * (§3-§10 de docs/crd/GUIA-FRONTEND-SERVICIOS-PAGO-PRESTAMOS.md).
 *
 * Convenciones que impone el backend y que estos tipos reflejan:
 * - Los montos SIEMPRE viajan en el body, nunca en la URL.
 * - Las fechas de entrada son strings `yyyy-MM-dd`; si se omiten el backend usa hoy y nunca
 *   acepta una fecha futura.
 * - `usuario` es obligatorio en todos los POST (máx. 50 caracteres).
 * - ⚠️ El campo de fecha se llama `fechaPago` en los pagos de cuota y `fecha` en el abono a
 *   capital y en la precancelación.
 */

// ===================== §3 GET /aprt/saldosPorEntidad/{idEntidad} =====================

/** Saldo neto disponible por tipo de aporte vigente de un partícipe. */
export interface SaldoAporte {
  idTipoAporte: number;
  nombre: string;
  saldo: number;
}

// ===================== POST /aprt/registrarAporte =====================

/**
 * Alta de un aporte del socio a su propia cuenta (cesantía, jubilación...). Es la operación
 * inversa a `pagarConAportes`: acá el partícipe ENTREGA dinero y su saldo sube.
 */
export interface RegistroAporteRequest {
  /** Código del partícipe (ENTD.ENTDCDGO), NO el del préstamo. */
  idEntidad: number;
  idTipoAporte: number;
  valor: number;
  usuario: string;
  observacion?: string | null;
  /** ⚠️ Se llama `fechaTransaccion`. `yyyy-MM-dd`. Default hoy; no puede ser futura. */
  fechaTransaccion?: string | null;
}

/** Responde 201, no 200. */
export interface ResultadoRegistroAporte {
  idAporte: number;
  idPagoAporte: number;
  idEntidad: number;
  idTipoAporte: number;
  nombreTipoAporte: string;
  valor: number;
  /** Saldo del tipo de aporte ya con el movimiento aplicado. */
  saldoTipoAporte: number;
  fechaTransaccion: string | number[] | Date;
}

// ===================== §4 POST /prst/pagarCuota =====================

export interface PagoCuotaRequest {
  idPrestamo: number;
  valor: number;
  usuario: string;
  observacion?: string | null;
  /** `yyyy-MM-dd`. Default hoy; no puede ser futura. */
  fechaPago?: string | null;
}

/** Efecto del pago sobre una cuota puntual. Los seis `aplicado*` suman `totalAplicado`. */
export interface CuotaAfectada {
  idCuota: number;
  numeroCuota: number;
  estadoAnterior: number;
  estadoNuevo: number;
  aplicadoDesgravamen: number;
  aplicadoMora: number;
  aplicadoInteresVencido: number;
  aplicadoInteres: number;
  aplicadoCapital: number;
  aplicadoSeguro: number;
  totalAplicado: number;
  idPagoPrestamo: number;
}

export interface ResultadoPagoCuota {
  idPrestamo: number;
  /** Lo único necesario para anular la operación después (§10). */
  idEvento: number;
  valorRecibido: number;
  valorAplicado: number;
  /** Debería ser siempre 0; si llega > 0 es una inconsistencia y hay que advertirlo. */
  excedenteNoAplicado: number;
  prestamoCancelado: boolean;
  estadoFinalPrestamo: number;
  /** En el orden en que se aplicó el pago: cuota más antigua primero. */
  cuotasAfectadas: CuotaAfectada[];
}

// ===================== §5 POST /prst/pagarConAportes =====================

export interface PagoConAportesRequest {
  idPrestamo: number;
  usuario: string;
  observacion?: string | null;
  /** `yyyy-MM-dd`. Default hoy. */
  fechaPago?: string | null;
  /** Al menos un renglón, sin tipos repetidos. El valor total del pago es su suma. */
  aportes: DesgloseAporte[];
}

/**
 * `pagarConAportes` devuelve el mismo `resultado` que `pagarCuota`; los movimientos de aporte
 * viajan fuera de `resultado` (ver `RespuestaPago.movimientosAporte`).
 */
export type ResultadoPagoConAportes = ResultadoPagoCuota;

// ===================== §6 GET /prst/simularAbonoCapital/{idPrestamo} =====================

/** Fila de la tabla de amortización proyectada. No se persiste. */
export interface CuotaProyectada {
  numeroCuota: number;
  fechaVencimiento: string;
  capital: number;
  interes: number;
  cuota: number;
  saldoCapital: number;
}

export interface SimulacionAbonoCapital {
  idPrestamo: number;
  saldoCapitalActual: number;
  valorAbono: number;
  modalidad: number;
  /** 1 = francesa, 2 = alemana. Lo toma del préstamo; el usuario no lo elige. */
  tipoAmortizacion: number;
  plazoActual: number;
  plazoNuevo: number;
  cuotaActual: number;
  cuotaNueva: number;
  /** El número que más vende la operación: destacarlo en pantalla. */
  ahorroIntereses: number;
  /** Cuántas cuotas vigentes serán reemplazadas. */
  cuotasAHistorizar: number;
  tablaProyectada: CuotaProyectada[];
}

// ===================== §7 POST /prst/abonarCapital =====================

export interface AbonoCapitalRequest {
  idPrestamo: number;
  valor: number;
  /** 1 = reduce plazo (mantiene cuota) · 2 = reduce cuota (mantiene plazo). */
  modalidad: number;
  usuario: string;
  observacion?: string | null;
  /** ⚠️ Se llama `fecha`, no `fechaPago`. `yyyy-MM-dd`. */
  fecha?: string | null;
}

export interface ResultadoAbonoCapital {
  idPrestamo: number;
  idEvento: number;
  idPagoPrestamo: number;
  idCuotaConSaldoOtros: number;
  valorAbono: number;
  modalidad: number;
  plazoAnterior: number;
  plazoNuevo: number;
  cuotaAnterior: number;
  cuotaNueva: number;
  cuotasHistorizadas: number;
  cuotasGeneradas: number;
}

// ===================== §8 GET /prst/simularPrecancelacion/{idPrestamo} =====================

/** Cuota con vencimiento hasta la fecha de corte que entra en la deuda exigible. */
export interface CuotaExigible {
  idCuota: number;
  numeroCuota: number;
  fechaVencimiento: string;
  pendiente: number;
}

export interface SimulacionPrecancelacion {
  idPrestamo: number;
  fecha: string;
  exigibles: CuotaExigible[];
  valorExigible: number;
  capitalFuturo: number;
  /** El monto que hay que cobrar. Depende de la fecha de corte: la mora sigue corriendo. */
  valorTotalPrecancelacion: number;
  cuotasAAnular: number;
  /** Intereses, desgravamen y seguros futuros condonados: el beneficio de precancelar. */
  interesCondonado: number;
}

// ===================== §9 POST /prst/precancelar =====================

export interface PrecancelacionRequest {
  idPrestamo: number;
  /** Default 0. No puede ser negativo. */
  valorEfectivo?: number;
  /** Mismas reglas que el desglose de §5. */
  aportes?: DesgloseAporte[];
  usuario: string;
  observacion?: string | null;
  /** Fecha de corte. Debe ser la misma que se usó al simular. `yyyy-MM-dd`. */
  fecha?: string | null;
}

export interface ResultadoPrecancelacion {
  idPrestamo: number;
  idEvento: number;
  valorExigiblePagado: number;
  capitalPrecancelado: number;
  valorTotalPrecancelacion: number;
  cuotasCanceladasAnticipadas: number;
  /** 4 = CANCELADO_ANTICIPADO. El préstamo queda terminal. */
  estadoFinalPrestamo: number;
  idCuotaConSaldoOtros: number;
  idPagoPrestamoCapitalFuturo: number;
  /** En precancelación los movimientos vienen DENTRO de `resultado`. */
  movimientosAporte?: MovimientoAporte[];
}

// ===================== §10 POST /prst/anularOperacion =====================

export interface AnulacionRequest {
  idEvento: number;
  usuario: string;
  /** Obligatorio; queda en la auditoría. */
  motivo: string;
}

export interface ResultadoAnulacion {
  idEvento: number;
  idPrestamo: number;
  tipoOperacion: string;
  pagosAnulados: number;
  cuotasRecalculadas: number;
  cuotasRestauradas: number;
  cuotasEliminadas: number;
  movimientosAporteRevertidos: number;
  estadoFinalPrestamo: number;
}

// ===================== §11 Historial =====================

/** Evento de pago (EVPR). Endpoint CRUD estándar: NO viene envuelto en `{exito, resultado}`. */
export interface EventoPrestamo {
  /** El `idEvento` para anular. */
  codigo: number;
  prestamo?: { codigo: number } | null;
  tipoOperacion: string;
  valor: number;
  fecha: string | number[] | Date;
  usuario: string;
  observacion?: string | null;
  /** 1 = vigente, 0 = anulado. */
  estado: number;
  usuarioAnulacion?: string | null;
  fechaAnulacion?: string | number[] | Date | null;
  motivoAnulacion?: string | null;
  // Solo en ABONO_CAPITAL
  modalidad?: number | null;
  plazoAnterior?: number | null;
  plazoNuevo?: number | null;
  cuotaAnterior?: number | null;
  cuotaNueva?: number | null;
}

/** Cuota historizada (HDTP): "cómo era la tabla antes del abono". */
export interface HistDetallePrestamo {
  codigo: number;
  codigoOriginal: number;
  prestamo?: { codigo: number } | null;
  numeroCuota: number;
  fechaVencimiento: string | number[] | Date;
  capital: number;
  interes: number;
  cuota: number;
  saldo: number;
  saldoCapital: number;
  estado: number;
  motivo?: string | null;
  fechaRegistroHist?: string | number[] | Date | null;
  usuarioHist?: string | null;
  [campoAdicional: string]: unknown;
}
