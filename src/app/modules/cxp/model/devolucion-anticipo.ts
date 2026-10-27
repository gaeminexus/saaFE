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

/** Línea de nota de crédito con saldo a favor — docs/cxp/NC-EXCEDE-SALDO-FACTURA.md §5.2. */
export interface LineaDevolucionNotaCredito {
  idNotaCredito: number;
  valor: number;
}

/** Forma en que el proveedor nos devuelve el dinero (DVPR.DVPRFPAG). Constantes, no catálogo — §5.1. */
export const FormaDevolucionProveedor = {
  TRANSFERENCIA: 1,
  CHEQUE: 2,
} as const;

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
  /** 1 transferencia (default del backend) · 2 cheque. */
  formaPago?: number;
  /** Puede venir vacío si solo se devuelven notas de crédito; al menos una de las dos listas con líneas. */
  anticipos: LineaDevolucionAnticipo[];
  notasCredito?: LineaDevolucionNotaCredito[];
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
  /** Ausente en las líneas de nota de crédito. */
  idAnticipo?: number;
  numeroDocAnticipo?: string;
  /** `ANTICIPO` | `NOTA_CREDITO`. Un backend anterior a la extensión no lo manda: se asume anticipo. */
  tipo?: 'ANTICIPO' | 'NOTA_CREDITO';
  idNotaCredito?: number;
  numeroNotaCredito?: string;
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
  /** 1 transferencia · 2 cheque. */
  formaPago?: number;
  detalle: DetalleDevolucionAnticipoListado[];
}
