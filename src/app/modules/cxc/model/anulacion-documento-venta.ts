/**
 * Anulación en cascada de documentos de venta (factura, NC, ND, liquidación en compras emitida,
 * retención V2) — ítem 14 del rediseño de pagos, contrato confirmado directo contra
 * `FacturaServiceImpl`/`NotaCreditoServiceImpl`/`NotaDebitoServiceImpl`/
 * `LiquidacionCompraServiceImpl`/`RetencionV2ServiceImpl` en saaBE, 2026-08-28.
 *
 * A diferencia de compra (cxp), el id va SIEMPRE en el body, no en la URL (`POST /<ruta>/anular`,
 * sin `/{id}`) — convención ya existente del lado venta desde antes de este ítem.
 *
 * Antes de este cambio, estos endpoints reversaban todos los cobros/movimientos EN SILENCIO al
 * anular. Ahora responden 409 salvo `anularEnCascada: true` — es un cambio de comportamiento
 * deliberado (corrige un defecto real), no una regresión: pantallas que hoy anulan sin preguntar
 * van a empezar a recibir 409.
 *
 * `LiquidacionCompra` (cxc, esta liquidación EMITIDA por la empresa) SÍ cascadea — no confundir
 * con `LiquidacionCompraCompra` (cxp, la RECIBIDA de un proveedor), que no tiene nada que
 * cascadear (ver `cxp/model/anulacion-documento-compra.ts`). Mismo nombre parecido,
 * comportamiento opuesto.
 */

export interface AnularFacturaVentaRequest {
  idFactura: number;
  motivo: string;
  usuario: string;
  idUsuario: number;
  anularEnCascada: boolean;
}

export interface AnularNotaCreditoVentaRequest {
  idNotaCredito: number;
  motivo: string;
  usuario: string;
  idUsuario: number;
  anularEnCascada: boolean;
}

export interface AnularNotaDebitoVentaRequest {
  idNotaDebito: number;
  motivo: string;
  usuario: string;
  idUsuario: number;
  anularEnCascada: boolean;
}

/** `LiquidacionCompra` (cxc) — la liquidación EMITIDA por la empresa; sí cascadea, a diferencia de `LiquidacionCompraCompra` (cxp). */
export interface AnularLiquidacionVentaRequest {
  idLiquidacion: number;
  motivo: string;
  usuario: string;
  idUsuario: number;
  anularEnCascada: boolean;
}

/** Retención V2 (`/rtv2`) — sus movimientos relacionados son facturas de COMPRA (`idFacturaCompra`), no de venta. */
export interface AnularRetencionVentaRequest {
  idRetencion: number;
  motivo: string;
  usuario: string;
  idUsuario: number;
  anularEnCascada: boolean;
}

/**
 * Respuesta de cualquiera de los 5 `/anular`. `exito: false` puede venir con 200 O 400 según el
 * tipo (factura/NC/ND/retención devuelven 400 cuando `exito=false`; verificado en cada Rest) —
 * nunca asumir éxito solo por el HTTP status, siempre leer el campo. El nombre del id devuelto
 * varía por tipo (`idFactura`/`idNotaCredito`/etc.), igual que en compra.
 */
export interface AnularDocumentoVentaResponse {
  exito: boolean;
  mensaje: string;
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  usuarioAnulacion?: string;
  aplicacionesReversadas?: number;
  movimientosReversados?: number;
  asientoAnulado?: number;
  advertenciaAsiento?: string;
  [key: string]: unknown;
}
