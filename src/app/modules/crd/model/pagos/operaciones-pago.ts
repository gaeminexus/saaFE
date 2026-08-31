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
 * - `rutaDocumentoRespaldo` es la ruta del comprobante ya digitalizado y subido con
 *   `FileService`. El backend la estampa en cada `PagoPrestamo`/`PagoAporte` que genere la
 *   operación (`PGPRRTRS` / `PGAPRTRS`, 2000 caracteres). Como viaja DENTRO del request, el
 *   archivo tiene que estar subido ANTES de llamar al endpoint de pago.
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
  /** Empresa contable (SCP.PJRQ) sobre la que se genera el asiento. Obligatorio. */
  idEmpresa: number;
  /** Código del partícipe (ENTD.ENTDCDGO), NO el del préstamo. */
  idEntidad: number;
  idTipoAporte: number;
  valor: number;
  usuario: string;
  observacion?: string | null;
  /** ⚠️ Se llama `fechaTransaccion`. `yyyy-MM-dd`. Default hoy; no puede ser futura. */
  fechaTransaccion?: string | null;
  /** Ruta del comprobante ya subido. Queda en el `PagoAporte` (`PGAPRTRS`). */
  rutaDocumentoRespaldo?: string | null;
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
  /** Empresa contable (SCP.PJRQ) sobre la que se genera el asiento. Obligatorio. */
  idEmpresa: number;
  idPrestamo: number;
  valor: number;
  usuario: string;
  observacion?: string | null;
  /** `yyyy-MM-dd`. Default hoy; no puede ser futura. */
  fechaPago?: string | null;
  /** Ruta del comprobante ya subido. Se estampa en todos los `PagoPrestamo` que genere el pago. */
  rutaDocumentoRespaldo?: string | null;
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

// ===================== §4b POST /prst/pagarMultiplesCuotas =====================

/**
 * Cobra varios préstamos del MISMO partícipe en una sola operación, con un solo comprobante
 * (pedido del usuario tras el bug de cobros-personales que borraba el monto cargado al cambiar de
 * préstamo). Es UNA SOLA TRANSACCIÓN todo-o-nada: si falla cualquiera de los `pagos`, el backend no
 * deja aplicado ninguno — la pantalla no debe mostrar progreso parcial ("2 de 3 aplicados").
 *
 * Cada renglón de `pagos` es el mismo `PagoCuotaRequest` de `/pagarCuota`; el `rutaDocumentoRespaldo`
 * es el mismo comprobante único repetido en todos los renglones.
 */
export interface PagoMultipleRequest {
  /** Empresa contable (SCP.PJRQ) sobre la que se genera el asiento. Obligatorio. */
  idEmpresa: number;
  pagos: PagoCuotaRequest[];
}

export interface ResultadoPagoMultiple {
  /** Uno por préstamo, en el MISMO ORDEN en que se mandaron en `pagos`. */
  resultados: ResultadoPagoCuota[];
  /** Suma de `valorAplicado` de todos los `resultados`. */
  valorTotalAplicado: number;
  idEntidad: number;
  nombreEntidad: string;
}

// ===================== §5 POST /prst/pagarConAportes =====================

export interface PagoConAportesRequest {
  /** Empresa contable (SCP.PJRQ) sobre la que se genera el asiento. Obligatorio. */
  idEmpresa: number;
  idPrestamo: number;
  usuario: string;
  observacion?: string | null;
  /** `yyyy-MM-dd`. Default hoy. */
  fechaPago?: string | null;
  /** Ruta del comprobante ya subido. Se estampa en todos los `PagoPrestamo` que genere el pago. */
  rutaDocumentoRespaldo?: string | null;
  /** Al menos un renglón, sin tipos repetidos. El valor total del pago es su suma. */
  aportes: DesgloseAporte[];
}

/**
 * `pagarConAportes` devuelve el mismo `resultado` que `pagarCuota`; los movimientos de aporte
 * viajan fuera de `resultado` (ver `RespuestaPago.movimientosAporte`).
 */
export type ResultadoPagoConAportes = ResultadoPagoCuota;

// ===================== §6 GET /prst/simularAbonoCapital/{idPrestamo} =====================

/**
 * Fila de la tabla de amortización proyectada. No se persiste.
 *
 * ⚠️ `fechaVencimiento` es un `LocalDateTime` que el backend serializa con Jackson como arreglo
 * (`[y,m,d,h,mi]`), nunca como ISO. Normalizar SIEMPRE con `FuncionesDatosService.formatoFecha()`
 * / `convertirFechaDesdeBackend()`, nunca con el pipe `date` de Angular a secas: un arreglo pasado
 * directo da `Invalid Date` (hallazgo de la §10.4 de `docs/crd/PLAN-SIMULADORES-PRESTAMOS.md`).
 */
export interface CuotaProyectada {
  numeroCuota: number;
  fechaVencimiento: string | number[] | Date;
  capital: number;
  interes: number;
  cuota: number;
  saldoCapital: number;
  /**
   * Desgravamen, seguro de incendio y total de la cuota (decisión 15 de
   * `docs/crd/PLAN-SIMULADORES-PRESTAMOS.md`). `total = cuota + desgravamen + seguroIncendio`,
   * el mismo invariante que `DTPRTTLL` en la tabla real. Opcionales y aditivos: hoy
   * `simularAbonoCapital` en producción los devuelve `null` (la calculadora todavía no los
   * llena ahí) — el llamador tiene que caer a `cuota` cuando `total` no vino, nunca asumir que
   * está presente.
   */
  desgravamen?: number | null;
  seguroIncendio?: number | null;
  total?: number | null;
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
  /** Empresa contable (SCP.PJRQ) sobre la que se genera el asiento. Obligatorio. */
  idEmpresa: number;
  idPrestamo: number;
  valor: number;
  /** 1 = reduce plazo (mantiene cuota) · 2 = reduce cuota (mantiene plazo). */
  modalidad: number;
  usuario: string;
  observacion?: string | null;
  /** ⚠️ Se llama `fecha`, no `fechaPago`. `yyyy-MM-dd`. */
  fecha?: string | null;
  /** Ruta del comprobante ya subido. Se estampa en el `PagoPrestamo` del abono. */
  rutaDocumentoRespaldo?: string | null;
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

/**
 * Cuota con vencimiento hasta la fecha de corte que entra en la deuda exigible.
 *
 * ⚠️ Mismo caso que `CuotaProyectada.fechaVencimiento`: llega como arreglo `[y,m,d,h,mi]`, nunca
 * con el pipe `date` de Angular a secas.
 */
export interface CuotaExigible {
  idCuota: number;
  numeroCuota: number;
  fechaVencimiento: string | number[] | Date;
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
  /** Empresa contable (SCP.PJRQ) sobre la que se genera el asiento. Obligatorio. */
  idEmpresa: number;
  idPrestamo: number;
  /** Default 0. No puede ser negativo. */
  valorEfectivo?: number;
  /** Mismas reglas que el desglose de §5. */
  aportes?: DesgloseAporte[];
  usuario: string;
  observacion?: string | null;
  /** Fecha de corte. Debe ser la misma que se usó al simular. `yyyy-MM-dd`. */
  fecha?: string | null;
  /** Ruta del comprobante ya subido. Se estampa en los pagos que genere la precancelación. */
  rutaDocumentoRespaldo?: string | null;
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
  /** Empresa contable (SCP.PJRQ) sobre la que se genera el asiento. Obligatorio. */
  idEmpresa: number;
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

// ===================== POST /prst/calcularMora[/{idPrestamo}] =====================

/**
 * Resumen de una corrida de cálculo de mora. El proceso normalmente lo dispara la corrida
 * automática de las 02:00; el endpoint es la vía de recuperación manual para cuando esa corrida
 * falló o el servidor estuvo apagado.
 */
export interface ResultadoCalculoMora {
  /** `yyyy-MM-dd` con el que se calculó la mora. */
  fechaCorte: string;
  /** ISO. Inicio y fin de la corrida. */
  fechaInicio: string;
  fechaFin: string;
  duracionMs: number;
  /** Préstamos con al menos una cuota vencida. */
  prestamosEvaluados: number;
  /** Procesados sin error. */
  prestamosProcesados: number;
  /** Cuotas a las que se les escribió mora. */
  cuotasActualizadas: number;
  /** Cuotas que pasaron a estado 5 (EN_MORA) en esta corrida. */
  cuotasMarcadasEnMora: number;
  /** Préstamos que pasaron a PRSTIDST = 11 (EN_MORA). */
  prestamosMarcadosEnMora: number;
  /** Préstamos que volvieron de 11 a 2 (VIGENTE). */
  prestamosRegularizados: number;
  totalMoraCalculada: number;
  prestamosConError: number;
  /** Detalle, hasta 50: "Préstamo 8523: mensaje". */
  errores: string[];
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
