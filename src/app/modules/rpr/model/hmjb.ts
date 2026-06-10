/** HMJB - Histórico de CJBM para consulta de períodos anteriores */
export interface Hmjb {
  /** HMJBIDJB – Identificación del jubilado (PK) */
  identificacion: string;
  /** HMJBTIDJ – Tipo de identificación */
  tipoIdentificacion: string;
  /** HMJBTPJB – Tipo de jubilación */
  tipoJubilacion: string;
  /** HMJBFCJB – Fecha de jubilación (String) */
  fechaJubilacion: string;
  /** HMJBIAJB – Imposiciones acumuladas */
  imposicionesAcumuladas: number;
  /** HMJBVLPN – Valor de la pensión */
  valorPension: number;
  /** HMJBVNAR – Valor neto a recibir */
  valorNetoRecibir: number;
  /** HMJBSCJB – Saldo de cuenta */
  saldoCuenta: number;
  /** HMJBVCAP – Valores compensados */
  valoresCompensados: number;
  /** HMJBJEIS – Jubilación en IESS */
  jubilacionIess: string;
}
