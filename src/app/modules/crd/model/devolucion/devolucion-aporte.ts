/**
 * Tipos de request y de resultado de la devolución de aportes
 * (§6 de `docs/crd/PLAN-DEVOLUCION-APORTES.md`).
 *
 * Reflejan 1:1 el contrato REST: no se agregan campos que el backend no declare.
 */

// ══════════════ POST /dvap/registrar ══════════════

/** Un renglón del desglose: cuánto se devuelve de cada tipo de aporte. */
export interface DetalleSolicitudDevolucion {
  idTipoAporte: number;
  valor: number;
}

export interface SolicitudDevolucion {
  idEntidad: number;
  /** CRD.CNBP a la que se transfiere. Obligatoria salvo débito automático. */
  idCuentaBancariaParticipe: number | null;
  /**
   * TSR.CNBC: la cuenta propia de la que sale el dinero. Ya NO la elige crédito al registrar: la
   * asigna Tesorería al aprobar el pago en Cuentas por Pagar. Mandarla desde acá hacía que la
   * devolución naciera con la cuenta ya asignada y se saltara la bandeja de aprobación de
   * Tesorería sin que nadie se enterara (decisión del usuario, ver `devolucion-aportes.component.ts`).
   * El backend la ignora/asigna en null si llega; el frontend simplemente no la manda.
   */
  idCuentaBancariaOrigen?: number | null;
  idEmpresa: number;
  idUsuario: number;
  usuario: string;
  /**
   * ⚠️ `LocalDate` en el backend: SIEMPRE string `yyyy-MM-dd` armado a mano.
   *
   * Nunca un `Date` de JavaScript ni nada terminado en `Z`: el backend serializa con Jackson,
   * que descarta el offset en vez de convertirlo, así que un `Date` de las 08:30 de Ecuador
   * viaja como `13:30Z` y se graba cinco horas adelantado sin ningún error visible.
   */
  fecha: string | null;
  motivo?: string | null;
  debitoAutomatico: boolean;
  referencia?: string | null;
  detalle: DetalleSolicitudDevolucion[];
}

/** Renglón del resultado: qué fila negativa de CRD.APRT se generó y cómo quedó el saldo. */
export interface DetalleResultadoDevolucion {
  idTipoAporte: number;
  nombreTipoAporte: string;
  valor: number;
  idAporteGenerado: number;
  saldoTipoAporteDespues: number;
}

/**
 * Resultado de registrar y de anular (el backend devuelve el mismo `ResultadoDevolucionAporte`
 * en ambos, §5.2 del plan). La pantalla solo ramifica por `exito`/`error` y vuelve a pedir
 * saldos e historial al backend, así que no depende de estos campos para quedar consistente.
 */
export interface ResultadoDevolucion {
  idDevolucion: number;
  /** Orden de pago generada en CXP (PGS.PGTR). */
  idPagoProgramado: number | null;
  estado: number;
  estadoTexto: string;
  valorTotal: number;
  detalle: DetalleResultadoDevolucion[];
}

// ══════════════ GET /dvap/porEntidad/{idEntidad} ══════════════

export interface DetalleDevolucionListado {
  idTipoAporte: number;
  nombreTipoAporte: string;
  valor: number;
}

/**
 * Una devolución del historial. El backend reconcilia contra el estado real del pago de CXP
 * antes de responder, así que lo que llega acá siempre está al día.
 */
export interface DevolucionListado {
  idDevolucion: number;
  /** `yyyy-MM-dd`. */
  fecha: string;
  valorTotal: number;
  estado: number;
  estadoTexto: string;
  idPagoProgramado: number | null;
  numeroAsiento: number | null;
  /** `yyyy-MM-dd`; solo cuando el pago quedó confirmado. */
  fechaPago: string | null;
  motivo: string | null;
  /** Ya viene enmascarada por el backend: `"PICHINCHA · AHORROS · 2200****91"`. */
  cuentaDestino: string | null;
  detalle: DetalleDevolucionListado[];
}

// ══════════════ GET /dvap/deudaVigente/{idEntidad} ══════════════

/** Un préstamo sin cancelar del partícipe, tal como lo resume el aviso de deuda. */
export interface PrestamoDeudaVigente {
  idPrestamo: number;
  idAsoprep: number | null;
  producto: string | null;
  /** Estado operativo: `PRST.idEstado` (PRSTIDST), nunca `estadoPrestamo`. */
  idEstado: number;
  estadoTexto: string;
  saldoPendiente: number;
  cuotasVencidas: number;
}

/**
 * Deuda vigente del partícipe. Es **puramente informativo**: se muestra en el diálogo de
 * confirmación para que el operador decida con el dato a la vista.
 *
 * `POST /dvap/registrar` NO lo valida y no tiene ningún código de error asociado: devolverle
 * aportes a alguien que debe un préstamo se avisa, no se impide, y tampoco se netea (§10.2 del
 * plan). Sin préstamos vigentes el backend responde 200 con `totalDeuda: 0` y `prestamos: []`,
 * nunca un error.
 */
export interface DeudaVigenteParticipe {
  idEntidad: number;
  totalDeuda: number;
  cantidadPrestamos: number;
  tieneMora: boolean;
  prestamos: PrestamoDeudaVigente[];
}

// ══════════════ POST /dvap/anular/{idDevolucion} ══════════════

export interface AnulacionDevolucionRequest {
  motivo: string;
  usuario: string;
  idUsuario: number;
}

// ══════════════ POST /dvap/sincronizar ══════════════

/** Recuperación manual del reconciliador; el timer de CRD hace lo mismo cada 30 minutos. */
export interface ResultadoSincronizacionDevolucion {
  evaluadas: number;
  marcadasPagadas: number;
  marcadasRechazadas: number;
  huerfanas: number;
  conError: number;
  errores: string[];
}
