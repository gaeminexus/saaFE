/** HMPR - Histórico CPRM: un registro por identificación + tipo de aporte */
export interface Hmpr {
  /** HMPRCDGO – Código único (Identity) */
  codigo: number | null;
  /** HMPRIDPR – Identificación del partícipe */
  identificacion: string;
  /** HMPRTIDP – Tipo de identificación */
  tipoIdentificacion: string;
  /** TPAPCDGO – FK al tipo de aporte (CRD.TPAP) */
  tipoAporte: number | null;
  /** HMPRTTL – Total acumulado de aportes para este tipo */
  totalAcumulado: number;
}
