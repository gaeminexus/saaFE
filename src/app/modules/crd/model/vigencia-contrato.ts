/**
 * Contrato con historial de vigencias (§4.1 de docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md).
 *
 * El valor operativo de una vigencia es siempre `monto`. El porcentaje solo recalcula el monto
 * al CREAR la vigencia — un cambio de remuneración cierra la vigencia y abre otra, nunca edita
 * el monto en sitio (comparar un mes pasado exige el monto que regía ESE mes).
 */

export const MODO_VIGENCIA = {
  CALCULADO: 1,
  FIJO: 2,
} as const;

export const MODO_VIGENCIA_TEXTO: Record<number, string> = {
  [MODO_VIGENCIA.CALCULADO]: 'Calculado',
  [MODO_VIGENCIA.FIJO]: 'Fijo',
};

/** `CRD.APRT.idTipoAporte`: 9 jubilación, 11 cesantía — no son consecutivos, son del catálogo. */
export const ID_TIPO_APORTE = {
  JUBILACION: 9,
  CESANTIA: 11,
} as const;

export interface VigenciaDTO {
  idVigencia: number;
  idContrato: number;
  idTipoAporte: number;
  nombreTipoAporte: string;
  /** `yyyy-MM-dd`. */
  fechaInicio: string | number[];
  /** `null` = vigente. */
  fechaFin: string | number[] | null;
  monto: number;
  porcentaje: number | null;
  remuneracion: number | null;
  modo: number;
  modoTexto: string;
  estado: number;
  observacion: string | null;
}

/** GET /rest/cntr/porEntidad/{idEntidad}. */
export interface ContratoPorEntidadDTO {
  idContrato: number;
  idEntidad: number;
  identificacion: string;
  razonSocial: string;
  estado: string;
  /** Espejo de la vigencia abierta; null cuando no hay vigencia de ese tipo. */
  montoJubilacion: number | null;
  montoCesantia: number | null;
  porcentajeJubilacion: number | null;
  porcentajeCesantia: number | null;
  remuneracionUnificada: number | null;
  vigencias: VigenciaDTO[];
}

/** POST /rest/vgcn. */
export interface NuevaVigenciaRequest {
  idContrato: number;
  idTipoAporte: number;
  /** `yyyy-MM-dd`. */
  fechaInicio: string;
  modo: number;
  monto: number;
  porcentaje: number | null;
  observacion: string | null;
  usuario: string;
}
