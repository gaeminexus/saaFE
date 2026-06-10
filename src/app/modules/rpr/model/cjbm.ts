/** CJBM - Crédito Jubilados Mensual (similar a G44) */
export interface Cjbm {
  /** CJBMCDGO – Código único del registro (Identity) */
  codigo: number | null;
  /** CJBMTIDJ – Tipo de identificación del jubilado */
  tipoIdentificacion: string;
  /** CJBMIDJB – Identificación del jubilado */
  identificacion: string;
  /** CJBMTPJB – Tipo de jubilación */
  tipoJubilacion: string;
  /** CJBMFCJB – Fecha de jubilación */
  fechaJubilacion: any;
  /** CJBMIAJB – Imposiciones acumuladas por jubilación */
  imposicionesAcumuladas: number;
  /** CJBMVLPN – Valor de la pensión */
  valorPension: number;
  /** CJBMVNAR – Valor neto a recibir */
  valorNetoRecibir: number;
  /** CJBMSCJB – Saldo de cuenta del jubilado */
  saldoCuenta: number;
  /** CJBMVCAP – Valores compensados al partícipe */
  valoresCompensados: number;
  /** CJBMJEIS – Jubilación en IESS (S/N) */
  jubilacionIess: string;
  valorJubilacion: number;
  valorSeguro: number;
  /** CJBMEJCC – FK a control de ejecución (RPR.EJCC) */
  ejecucionReporte: { codigo: number; mes: number; anio: number };
}
