/**
 * Catálogos compartidos entre las aplicaciones de pago de CXP (/aplp) y CXC (/aplc).
 * El backend usa los mismos códigos en ambos dominios.
 */

/** Tipo de documento que originó el abono. */
export enum TipoDocPago {
  PAGO_DIRECTO = 1,
  NOTA_CREDITO = 2,
  RETENCION = 3,
  ANTICIPO = 4,
  NOTA_DEBITO = 5,
}

export interface EtiquetaCatalogo {
  texto: string;
  icono: string;
  /** true cuando la fila la genera el backend sola (retenciones, NC/ND). */
  automatico: boolean;
}

export const TIPO_DOC_PAGO_LABELS: Record<number, EtiquetaCatalogo> = {
  [TipoDocPago.PAGO_DIRECTO]: { texto: 'Pago directo', icono: 'account_balance', automatico: false },
  [TipoDocPago.NOTA_CREDITO]: { texto: 'Nota de Crédito', icono: 'assignment_return', automatico: true },
  [TipoDocPago.RETENCION]: { texto: 'Retención', icono: 'description', automatico: true },
  [TipoDocPago.ANTICIPO]: { texto: 'Anticipo', icono: 'savings', automatico: false },
  [TipoDocPago.NOTA_DEBITO]: { texto: 'Nota de Débito', icono: 'assignment_late', automatico: true },
};

/** Estado de una fila de abono. Una fila reversada ya no cuenta para el saldo. */
export enum EstadoAplicacion {
  ACTIVO = 1,
  REVERSADO = 2,
}

/** Estado de pago de la factura (viene en la factura y en la respuesta de /saldo). */
export enum EstadoPagoFactura {
  PENDIENTE = 1,
  PAGO_PARCIAL = 2,
  PAGADA = 3,
}

export interface EtiquetaEstado {
  texto: string;
  /** Clase CSS de badge; los estilos viven en el SCSS de cada pantalla. */
  clase: string;
}

export const ESTADO_PAGO_LABELS: Record<number, EtiquetaEstado> = {
  [EstadoPagoFactura.PENDIENTE]: { texto: 'Pendiente', clase: 'badge-neutro' },
  [EstadoPagoFactura.PAGO_PARCIAL]: { texto: 'Pago parcial', clase: 'badge-parcial' },
  [EstadoPagoFactura.PAGADA]: { texto: 'Pagada', clase: 'badge-pagada' },
};

/** Estado de un PagoProgramado (solo CXP — ciclo del pago por transferencia). */
export enum EstadoPagoProgramado {
  REGISTRADO = 1,
  EN_ARCHIVO = 2,
  CONFIRMADO = 3,
  RECHAZADO = 4,
  ANULADO = 5,
}

export const ESTADO_PAGO_PROGRAMADO_LABELS: Record<number, EtiquetaEstado> = {
  [EstadoPagoProgramado.REGISTRADO]: { texto: 'Registrado', clase: 'badge-neutro' },
  [EstadoPagoProgramado.EN_ARCHIVO]: { texto: 'En archivo', clase: 'badge-parcial' },
  [EstadoPagoProgramado.CONFIRMADO]: { texto: 'Confirmado', clase: 'badge-pagada' },
  [EstadoPagoProgramado.RECHAZADO]: { texto: 'Rechazado', clase: 'badge-rechazado' },
  [EstadoPagoProgramado.ANULADO]: { texto: 'Anulado', clase: 'badge-anulado' },
};

/** Estado de un LotePago. */
export enum EstadoLotePago {
  GENERADO = 1,
  RESPUESTA_PROCESADA = 2,
  ANULADO = 3,
}

/**
 * Saldo de una factura, tal como lo devuelven GET /aplp/saldo/{id} y GET /aplc/saldo/{id}.
 * Las acciones (cruce de anticipo, cobro, reverso) devuelven estos mismos campos
 * embebidos en su respuesta, para evitar un refetch.
 */
export interface SaldoFactura {
  facturaId: number;
  numeroFactura: string;
  total: number;
  totalAplicado: number;
  saldoPendiente: number;
  estadoPago: number;
}

/** Body de las acciones que exigen motivo (revertir abono, anular/revertir pago). */
export interface MotivoRequest {
  motivo: string;
  idUsuario: number;
}

/** Documento referenciado desde una fila de abono (NC, ND, retención, anticipo). */
export interface DocumentoRelacionado {
  id?: number;
  codigo?: number;
  numero?: string;
  numeroDoc?: string;
}

/**
 * Parte común de una fila del historial de abonos. CXP y CXC solo difieren
 * en cómo referencian la factura, así que la tabla que las pinta trabaja
 * contra esta forma.
 */
export interface FilaAbono {
  id: number;
  /** Ver TipoDocPago. */
  tipoDocPago: number;
  notaCredito?: DocumentoRelacionado | null;
  retencion?: DocumentoRelacionado | null;
  retencionV2?: DocumentoRelacionado | null;
  notaDebito?: DocumentoRelacionado | null;
  anticipo?: DocumentoRelacionado | null;
  formaPago?: string | null;
  referencia?: string | null;
  banco?: string | null;
  /** Negativo en notas de débito (aumentan el saldo). */
  montoAplicado: number;
  fechaAplicacion: any;
  observacion?: string | null;
  /** 1=Activo, 2=Reversado. */
  estado: number;
  usuario?: { codigo: number; nombre: string } | null;
  asiento?: { codigo: number; numeroAlterno: string } | null;
  fechaRegistro?: any;
}
