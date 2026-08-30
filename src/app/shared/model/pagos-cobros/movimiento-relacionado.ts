/**
 * Fila de GET .../movimientosRelacionados/{id} — usado por la anulación en cascada de
 * documentos de compra (cxp) y venta (cxc), ítems 12/13/14. La forma NO es uniforme entre
 * tipos de documento pese a que el nombre del endpoint es el mismo en los cinco — verificado
 * directo contra cada ServiceImpl, no asumido por similitud:
 *
 * - Factura y liquidación: traen `tipoDocPago`/`tipoDocPagoTexto` (qué se aplicó CONTRA el
 *   documento — cobro directo, nota, retención, anticipo).
 * - Nota de crédito y nota de débito (venta Y compra): traen `idFactura`/`idFacturaCompra` en
 *   su lugar (a qué factura se aplicó ESTA nota) — no tienen `tipoDocPago` en absoluto.
 * - `tipoDocPagoTexto` puede faltar incluso cuando `tipoDocPago` está presente (la liquidación
 *   de compra en cxc no lo resuelve) — nunca asumir que viene poblado.
 *
 * Nunca los dos grupos de campos vienen juntos en una misma fila.
 */
export interface MovimientoRelacionado {
  idAplicacion: number;
  tipoDocPago?: number;
  tipoDocPagoTexto?: string;
  idFactura?: number;
  idFacturaCompra?: number;
  montoAplicado: number;
  fechaAplicacion: string | null;
}
