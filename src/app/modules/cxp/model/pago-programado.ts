import { SaldoFactura } from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';

/**
 * PGTR - Pago Programado. Un pago a proveedor por transferencia, con su
 * ciclo de vida: registrado → en archivo → confirmado/rechazado (o anulado).
 * Registrar un pago NO mueve el saldo de la factura; eso ocurre recién
 * cuando el banco lo confirma (carga de respuesta del lote).
 */
export interface PagoProgramado {
  id: number;
  facturaCompra?: { id: number; numero: string } | null;
  titular?: { codigo: number; nombre: string } | null;
  cuentaBancaria?: { codigo: number; numero: string; banco?: { nombre: string } } | null;
  cuentaDestino?: { id: number; numero: string; banco?: { nombre: string } } | null;
  valor: number;
  fechaProgramada: any;
  /** Ver EstadoPagoProgramado en shared/model/pagos-cobros. */
  estado: number;
  observacion?: string | null;
  usuario?: { codigo: number; nombre: string } | null;
  fechaRegistro?: any;
}

/** Body de POST /pgtr. */
export interface RegistrarPagoRequest {
  idFacturaCompra: number;
  idCuentaBancariaOrigen: number;
  /** Opcional; si se envía debe ser una cuenta del mismo proveedor de la factura. */
  idCuentaDestinoTitular?: number;
  valor: number;
  fechaProgramada?: string;
  idEmpresa: number;
  idUsuario: number;
  observacion?: string;
}

/** Respuesta 201 de POST /pgtr. El saldo de la factura todavía no cambia. */
export interface RegistrarPagoResponse extends SaldoFactura {
  exito: boolean;
  mensaje: string;
  pago?: number;
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
