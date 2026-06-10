/** CPRM - Crédito Partícipes Mensual. Un registro por entidad + tipo de aporte. */
export interface Cprm {
  /** CPRMCDGO – Código único del registro (Identity) */
  codigo: number | null;
  /** CPRMTIDP – Tipo de identificación del partícipe */
  tipoIdentificacion: string;
  /** CPRMIDPR – Identificación del partícipe */
  identificacion: string;
  /** TPAPCDGO – FK al tipo de aporte (CRD.TPAP) */
  tipoAporte: { codigo: number; nombre: string };
  /** CPRMTTAL – Total acumulado de aportes para este tipo hasta la fecha de corte */
  total: number;
  nombreEstado : string;
  /** CPRMEJCC – FK a control de ejecución (RPR.EJCC) */
  ejecucionReporte: { codigo: number; mes: number; anio: number };
  /** ENTDCDGO – FK a entidad (CRD.ENTD) para búsqueda rápida */
  entidad: { codigo: number; numeroIdentificacion: string } | null;
}
