/**
 * Flag de contabilidad de CRD (§4.3 de docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md).
 *
 * Global: apagarlo no bloquea los procesos de créditos, solo evita que generen asientos
 * contables. Refleja rubro 237 / detalle 1 (`CRD_PARAMETROS_CONTABILIDAD`).
 */

/** Respuesta de GET /rest/cnfg/contabilidadCrd. El contrato solo garantiza `activa`. */
export interface EstadoContabilidadCrd {
  activa: boolean;
  /** No está en el contrato congelado; si el backend lo agrega más adelante, se muestra igual. */
  motivo?: string | null;
}

export interface ActualizarContabilidadCrd {
  activa: boolean;
  usuario: string;
  motivo: string;
}
