/**
 * Anulación de documentos de compra (factura/liquidación/NC/ND) — ítem 12/13 del rediseño de
 * pagos, contrato confirmado directo contra `FacturaCompraServiceImpl.anularFacturaCompra` /
 * `movimientosRelacionadosFactura` (y sus equivalentes NC/ND) en saaBE el 2026-08-28. La
 * liquidación de compra (`lqcc`) es la única excepción: no tiene movimientos que cascadear
 * (sin FK ni query que la relacione con pagos) — solo anulación simple, sin `idUsuario` ni
 * `anularEnCascada`, ver {@link AnularLiquidacionCompraRequest}.
 */
import { MovimientoRelacionado } from '../../../shared/model/pagos-cobros/movimiento-relacionado';

/**
 * Alias histórico del tipo compartido — se mantiene para no tocar los `import` ya escritos en
 * `factura-compra.service.ts`/`nota-credito-compra.service.ts`/`nota-debito-compra.service.ts`.
 * Corregido el 2026-08-28: la forma NO es la misma para los tres — factura trae
 * `tipoDocPago`/`tipoDocPagoTexto`, NC/ND traen `idFacturaCompra` en su lugar (verificado
 * directo contra `NotaCreditoCompraServiceImpl`/`NotaDebitoCompraServiceImpl`, que NO copian el
 * bloque de `tipoDocPago` de `FacturaCompraServiceImpl`) — el diálogo ya sabe mostrar cualquiera
 * de los dos casos, ver `AnularDocumentoCompraDialogComponent.etiquetaMovimiento`.
 */
export type MovimientoRelacionadoCompra = MovimientoRelacionado;

/** Body de POST /<ruta>/anular/{id} para factura/NC/ND de compra (fctc/ntcc/ntdc). */
export interface AnularDocumentoCompraRequest {
  motivo: string;
  usuario: string;
  idUsuario: number;
  anularEnCascada: boolean;
}

/** Body de POST /lqcc/anular/{id} — la liquidación no cascadea: sin idUsuario ni anularEnCascada. */
export interface AnularLiquidacionCompraRequest {
  motivo: string;
  usuario: string;
}

/**
 * Respuesta 200 de cualquiera de los 4 /anular. `exito` puede venir `false` con 200 (documento
 * no encontrado o ya anulado) — no asumir éxito solo porque el HTTP status sea 200, hay que leer
 * el campo. El id devuelto varía de nombre por tipo (`idFactura`/`idLiquidacion`/
 * `idNotaCredito`/`idNotaDebito`), por eso queda como índice abierto en vez de un campo fijo.
 */
export interface AnularDocumentoCompraResponse {
  exito: boolean;
  mensaje: string;
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  usuarioAnulacion?: string;
  /** Solo si había movimientos y se pidió `anularEnCascada: true`. */
  movimientosReversados?: number;
  asientoAnulado?: number;
  advertenciaAsiento?: string;
  [key: string]: unknown;
}
