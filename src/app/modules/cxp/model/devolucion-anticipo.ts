/**
 * Devolución del saldo de anticipos de un proveedor — docs/cxp/API-DEVOLUCION-ANTICIPO-PROVEEDOR.md
 * §4.2. El proveedor deposita en nuestro banco el saldo a favor que le quedó en sus anticipos
 * (DEBE Banco / HABER Anticipos del proveedor). Un depósito puede devolver varios anticipos del
 * mismo proveedor, pero es UN asiento y UN movimiento bancario por el total — nunca una devolución
 * por anticipo.
 */

/** PGS.DVPR.DVPRESTD. Constantes, no catálogo (§4.1 del contrato). */
export const EstadoDevolucionAnticipoProveedor = {
  ACTIVA: 1,
  ANULADA: 2,
} as const;

export interface LineaDevolucionAnticipo {
  idAnticipo: number;
  valor: number;
}

/** Body de POST /dvpr/registrar — §4.2. */
export interface RegistrarDevolucionAnticipoRequest {
  idEmpresa: number;
  idTitular: number;
  idCuentaBancaria: number;
  /** yyyy-MM-dd. */
  fecha: string;
  referencia?: string;
  observacion?: string;
  idUsuario: number;
  anticipos: LineaDevolucionAnticipo[];
}

/** Respuesta 200 de POST /dvpr/registrar. */
export interface RegistrarDevolucionAnticipoResponse {
  exito: boolean;
  mensaje: string;
  devolucion: number;
  /** numeroAlterno del asiento. */
  asiento: string;
  /** Código (PK) del asiento, para imprimirlo con la plantilla oficial — docs/cnt/DISENO-IMPRIMIR-ASIENTO-DESDE-ORIGEN.md. */
  idAsiento?: number;
}

/** Body de POST /dvpr/anular/{id}. */
export interface AnularDevolucionAnticipoRequest {
  motivo: string;
  idUsuario: number;
}

export interface AnularDevolucionAnticipoResponse {
  exito: boolean;
  mensaje: string;
}

/** Línea de `detalle` de GET /dvpr/listar. */
export interface DetalleDevolucionAnticipoListado {
  idAnticipo: number;
  numeroDocAnticipo?: string;
  valor: number;
}

/**
 * Fila de GET /dvpr/listar — proyección `DVPR`, no la entidad. La más reciente primero.
 * Fechas (`fecha`) llegan como arreglo [y,m,d] del backend — normalizar con
 * `FuncionesDatosService.convertirFechaDesdeBackend()`.
 */
export interface DevolucionAnticipoListado {
  id: number;
  fecha: any;
  valor: number;
  referencia?: string;
  estado: number;
  /** Texto "banco — número", ya armado por el backend. */
  cuentaBancaria: string;
  numeroAsiento?: string;
  /** Código (PK) del asiento, para imprimirlo con la plantilla oficial — docs/cnt/DISENO-IMPRIMIR-ASIENTO-DESDE-ORIGEN.md. */
  idAsiento?: number;
  motivoAnulacion?: string;
  detalle: DetalleDevolucionAnticipoListado[];
}
