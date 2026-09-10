/**
 * Respuesta de `POST {recurso}/contabilizar/{id}` para los cinco documentos electrónicos
 * (docs/cxc/API-CONTABILIZAR-DOCUMENTO-AUTORIZADO.md §3) — misma forma en los cinco, un solo
 * manejador en el frontend.
 *
 * `200` siempre que el proceso haya corrido, autorizado o no el resultado contable: hay que mirar
 * `exito`, nunca el HTTP. El backend es idempotente (`yaEstabaCompleto: true` si no había nada
 * que hacer) — el frontend no decide si falta el asiento o el cruce, solo muestra el botón para
 * todo documento autorizado y deja que el backend conteste.
 */
export interface ContabilizarDocumentoResponse {
  exito: boolean;
  asiento?: number;
  aplicacionPago?: number;
  yaEstabaCompleto?: boolean;
  contabilidadPendiente?: boolean;
  /** Lista de textos ya redactados para el usuario (p. ej. qué cuenta contable falta y dónde configurarla). */
  erroresContables?: string[];
  mensaje: string;
}
