/**
 * Etiqueta de una fila de PGS.FCTC según su `tipoComprobante`, no según qué endpoint la trajo.
 *
 * FCTC guarda tanto facturas cargadas por XML del SRI ("01") como notas de venta ingresadas a
 * mano ("02", docs/cxp/API-NOTA-VENTA-COMPRA-MANUAL.md) — misma tabla, mismas pantallas de
 * estado de cuenta, proposición de pago y cruce de caja chica (§4.2 del contrato). Los tres
 * consumidores rotulaban por endpoint y le decían "Factura" a una nota de venta; este es el
 * único lugar que resuelve esa etiqueta — no repetir el criterio en cada pantalla, que es
 * exactamente cómo terminaron conviviendo dos `extraerCodigo` con criterios opuestos en este
 * mismo repositorio.
 */
export function etiquetaTipoComprobanteFactura(tipoComprobante: string | null | undefined): string {
  return tipoComprobante === '02' ? 'Nota de venta' : 'Factura';
}
