// Condición bloqueante devuelta por el backend al registrar un documento CXP.
// Forma compartida por el 422 de registrarBD/{id} y por progresoLote/{idCargaTxt} (§6.3 del
// PLAN-CARGA-AUTOMATICA-SRI: "bloqueantes reusa exactamente la forma que ya devuelve el 422"),
// y también por POST /fctc/manual (§2 de API-NOTA-VENTA-COMPRA-MANUAL.md).
export interface ErrorBloqueante {
  tipo: string;
  detalle: string;
  productos?: string[];
  grupos?: string[];
}

/**
 * Etiqueta y ícono de cada `tipo` de bloqueante — ÚNICO mapa del repositorio, importado por
 * `gestion-documentos.component.ts` (carga automática SRI) y por
 * `nota-venta-compra-manual.component.ts` (registro manual): los dos flujos comparten cuatro de
 * estos seis códigos, y un código nuevo que uno de los dos empiece a emitir ya lo sabe mostrar
 * el otro sin tocarlo. Nunca definir una copia local — es exactamente cómo este repositorio
 * terminó con dos `extraerCodigo` de criterios opuestos y, por un rato, con `PRODUCTO_` y
 * `PRODUCTOS_` conviviendo como si fueran cosas distintas.
 *
 * La redacción de `PRODUCTOS_SIN_CLASIFICAR` (y las otras compartidas) es neutral respecto de
 * cuántas filas dispararon la condición: la carga automática las agrega en una entrada, el
 * registro manual emite una por producto — el texto no afirma cardinalidad, así que le sirve a
 * los dos sin tener que elegir singular o plural por flujo.
 *
 * Un código que llegue sin estar en el mapa cae al fallback del llamador (`?? tipo` para la
 * etiqueta, `'error_outline'` para el ícono en ambas pantallas): se muestra el código crudo, no
 * desaparece.
 */
export const BLOQUEANTE_TIPO_LABELS: Record<string, { label: string; icon: string }> = {
  PROVEEDOR_SIN_CUENTA:         { label: 'Proveedor sin cuenta contable CxP',           icon: 'account_balance' },
  CLIENTE_SIN_CUENTA:           { label: 'Cliente sin cuenta contable CxC',             icon: 'account_balance' },
  PRODUCTOS_SIN_CLASIFICAR:     { label: 'Productos sin grupo asignado',                 icon: 'category' },
  GRUPOS_SIN_CUENTA_CONTABLE:   { label: 'Grupos sin cuenta contable',                   icon: 'folder_open' },
  TIPO_ASIENTO_NO_CONFIGURADO:  { label: 'Tipo de asiento no configurado',               icon: 'receipt_long' },
  CODIGOS_RETENCION_SIN_CUENTA: { label: 'Códigos de retención sin cuenta contable',     icon: 'percent' },
  FACTURA_VENTA_NO_ENCONTRADA:  { label: 'Factura de venta del sustento no encontrada',  icon: 'search_off' },
  RETENCION_MULTIDOCUMENTO:     { label: 'Retención con varios documentos sustento',     icon: 'call_split' },
  DOCUMENTO_DUPLICADO:          { label: 'Documento duplicado',                          icon: 'content_copy' },
};
