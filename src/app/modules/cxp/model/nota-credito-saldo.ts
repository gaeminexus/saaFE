/**
 * Saldo de una nota de crédito de compra — docs/cxp/NC-EXCEDE-SALDO-FACTURA.md §6.
 * El saldo de la NC se CALCULA en el backend (total − aplicado − devuelto): ninguna pantalla lo guarda.
 */

/** Fila de GET /ntcc/disponibles/{idTitular}/{idEmpresa} — NC registradas y vigentes con saldo > 0,01. */
export interface NotaCreditoDisponible {
  idNotaCredito: number;
  numero: string;
  /** Llega como arreglo [y,m,d] del backend — normalizar con `FuncionesDatosService.convertirFechaDesdeBackend()`. */
  fecha: any;
  numDocModificado?: string;
  total: number;
  aplicado: number;
  devuelto: number;
  saldo: number;
}

/**
 * Fila de GET /ntdc/pendientes/{idTitular}/{idEmpresa} — §4.1. Una ND de compra no tiene saldo propio:
 * su valor es saldo de la factura que modifica, así que cruzar contra la ND es cruzar contra esa factura.
 */
export interface NotaDebitoPendiente {
  idNotaDebito: number;
  numero: string;
  /** Llega como arreglo [y,m,d] del backend — normalizar con `FuncionesDatosService.convertirFechaDesdeBackend()`. */
  fecha: any;
  total: number;
  idFacturaCompra: number;
  numeroFactura: string;
  saldoFactura: number;
}

/**
 * Body de POST /aplp/cruzarNotaCredito — §4 y §4.1. Exactamente UNO de `idFacturaCompra` o
 * `idNotaDebito`: mandar los dos o ninguno da 400.
 */
export interface CruzarNotaCreditoRequest {
  idNotaCredito: number;
  idFacturaCompra?: number;
  idNotaDebito?: number;
  valor: number;
  /** yyyy-MM-dd. */
  fecha: string;
  idEmpresa: number;
  idUsuario: number;
  observacion?: string;
}

/** Respuesta 200 de POST /aplp/cruzarNotaCredito — §4. */
export interface CruzarNotaCreditoResponse {
  exito: boolean;
  mensaje: string;
  /** Id de la fila APLP creada. */
  aplicacion: number;
  saldoNotaCredito: number;
  saldoFactura: number;
}
