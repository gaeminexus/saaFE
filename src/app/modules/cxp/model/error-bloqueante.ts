// Condición bloqueante devuelta por el backend al registrar un documento CXP.
// Forma compartida por el 422 de registrarBD/{id} y por progresoLote/{idCargaTxt} (§6.3 del
// PLAN-CARGA-AUTOMATICA-SRI: "bloqueantes reusa exactamente la forma que ya devuelve el 422").
export interface ErrorBloqueante {
  tipo: string;
  detalle: string;
  productos?: string[];
  grupos?: string[];
}
