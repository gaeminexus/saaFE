/**
 * Etiquetas legibles de `PagoProgramado.origenExterno` (§7.1 de
 * `docs/crd/PLAN-DEVOLUCION-APORTES.md`). Para CXP el valor es un texto opaco: este es el único
 * archivo que lo traduce a algo que se le muestra al usuario. El día que se retire `crd`, borrar
 * este archivo (y las líneas que lo importan) alcanza.
 */
const ETIQUETAS_ORIGEN_PAGO_EXTERNO: Record<string, string> = {
  CRD_DEVOLUCION_APORTE: 'Devolución de aportes',
};

/** Etiqueta legible del origen externo; si no está en el mapa, se muestra el código tal cual. */
export function etiquetaOrigenPagoExterno(origen: string): string {
  return ETIQUETAS_ORIGEN_PAGO_EXTERNO[origen] ?? origen;
}
