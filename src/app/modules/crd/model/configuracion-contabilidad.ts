/**
 * Flag de contabilidad de CRD (§4.3 de docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md).
 *
 * Global: apagarlo no bloquea los procesos de créditos, solo evita que generen asientos
 * contables. Refleja rubro 237 / detalle 1 (`CRD_PARAMETROS_CONTABILIDAD`).
 */

/**
 * Respuesta de GET /rest/cnfg/contabilidadCrd. El contrato congelado (§4.3) solo garantiza
 * `activa`; los otros tres campos no están en el contrato pero el backend real los devuelve —
 * verificado contra el backend desplegado el 2026-08-27: `{ activa, usuarioUltimoCambio,
 * fechaUltimoCambio, motivoUltimoCambio }`. Se consumen con esos nombres tal cual llegan.
 */
export interface EstadoContabilidadCrd {
  activa: boolean;
  usuarioUltimoCambio?: string | null;
  fechaUltimoCambio?: string | number[] | null;
  motivoUltimoCambio?: string | null;
}

export interface ActualizarContabilidadCrd {
  activa: boolean;
  usuario: string;
  motivo: string;
}
