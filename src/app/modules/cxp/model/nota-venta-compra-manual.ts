/**
 * Nota de venta de compra, ingreso manual — contrato congelado en
 * docs/cxp/API-NOTA-VENTA-COMPRA-MANUAL.md. Se graba como FacturaCompra con
 * tipoComprobante = "02", vía POST /rest/fctc/manual (§1) — NO el CRUD genérico de /fctc
 * (§0.2 del contrato: ese no valida, no crea detalles ni genera asiento).
 */

/** §1 — línea de detalle. `idProducto` determina la cuenta del DEBE, por el grupo del producto. */
export interface DetalleNotaVentaManual {
  idProducto: number;
  descripcion: string;
  cantidad: number;
  valor: number;
  descuento?: number;
  baseImponible: number;
  porcentajeIVA?: number;
  valorIVA?: number;
  codigoIVASRI?: string;
  total: number;
}

/** §1 — forma de pago. Opcional: si `formasPago` va vacío, no se crea ninguna. */
export interface FormaPagoNotaVentaManual {
  formaPago: string;
  valor: number;
  plazo?: number;
  unidadTiempo?: string;
}

/**
 * Cuerpo de POST /rest/fctc/manual. `fecha` va ISO local SIN ZONA
 * (p. ej. "2026-09-04T00:00:00") — nunca un Date crudo ni nada terminado en "Z"
 * (trampa §0.3: Jackson descarta el offset en vez de convertirlo).
 * El servidor NO recalcula subtotal/vIVA/total a partir del detalle: graba lo que llega.
 */
export interface NotaVentaCompraManualRequest {
  idEmpresa: number;
  idUsuario: number;
  idTitular: number;
  numEstablecimiento: string;
  numPtoEmision: string;
  secuencial: string;
  autorizacion?: string;
  fecha: string;
  observacion?: string;
  subtotal: number;
  subcero?: number;
  descuento?: number;
  pIVA?: number;
  vIVA?: number;
  total: number;
  detalles: DetalleNotaVentaManual[];
  formasPago?: FormaPagoNotaVentaManual[];
}

/** §2 — condición bloqueante: con `exito:false` no se grabó nada (§0.4 / §3 del contrato). */
export interface BloqueanteNotaVentaManual {
  tipo: string;
  detalle: string;
}

export interface NotaVentaCompraManualResponseExito {
  exito: true;
  idFactura: number;
  numero: string;
  /** Puede venir `null` si la empresa tiene la generación contable apagada. No es un error. */
  asiento: string | null;
  sustento: string;
  mensaje: string;
}

export interface NotaVentaCompraManualResponseBloqueada {
  exito: false;
  bloqueantes: BloqueanteNotaVentaManual[];
}

/** Respuesta 200 de /fctc/manual. Distinguir por `exito`, nunca por el código HTTP (§0.4). */
export type NotaVentaCompraManualResponse =
  | NotaVentaCompraManualResponseExito
  | NotaVentaCompraManualResponseBloqueada;

export interface OpcionFormaPagoSri { codigo: string; descripcion: string; }

/** Tabla 19 SRI — formas de pago. */
export const SRI_FORMA_PAGO: OpcionFormaPagoSri[] = [
  { codigo: '01', descripcion: 'Sin utilización del sistema financiero' },
  { codigo: '15', descripcion: 'Compensación de deudas' },
  { codigo: '16', descripcion: 'Tarjeta de débito' },
  { codigo: '17', descripcion: 'Dinero electrónico' },
  { codigo: '18', descripcion: 'Tarjeta prepago' },
  { codigo: '19', descripcion: 'Tarjeta de crédito' },
  { codigo: '20', descripcion: 'Otros con utilización del sistema financiero' },
  { codigo: '21', descripcion: 'Endoso de títulos' },
];
