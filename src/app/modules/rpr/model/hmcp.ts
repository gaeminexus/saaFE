/** HMCP - Histórico de CCPM para consulta de períodos anteriores */
export interface Hmcp {
  /** HMCPNMOP – Número de operación (PK) */
  numeroOperacion: string;
  /** HMCPTIDS – Tipo de identificación */
  tipoIdentificacion: string;
  /** HMCPIDSJ – Identificación del sujeto */
  identificacion: string;
  /** HMCPTPCR – Tipo de crédito */
  tipoCredito: string;
  /** HMCPDDMR – Días de morosidad */
  diasMorosidad: number;
  /** HMCPCLPR – Calificación propia */
  calificacionPropia: string;
  /** HMCPTDIN – Tasa de interés */
  tasaInteres: number;
  /** HMCPVPVN – Valor por vencer */
  valorPorVencer: number;
  /** HMCPVLVN – Valor vencido */
  valorVencido: number;
  /** HMCPCSPR – Costos operativos */
  costosOperativos: number;
  /** HMCPINRD – Interés ordinario */
  interesOrdinario: number;
  /** HMCPISMR – Interés sobre mora */
  interesMora: number;
  /** HMCPVEDJ – Valor en demanda judicial */
  valorDemandaJudicial: number;
  /** HMCPCRCS – Cartera castigada */
  carteraCastigada: number;
  /** HMCPPRRO – Provisión requerida original */
  provisionRequeridaOriginal: number;
  /** HMCPPRCN – Provisión constituida */
  provisionConstituida: number;
  /** HMCPVTCI – Valor total cuenta individual */
  valorTotalCuentaIndividual: number;
  /** HMCPVSAP – Valor sujeto a provisión */
  valorSujetoProvision: number;
  /** HMCPTDSA – Tipo de sistema de amortización */
  tipoSistemaAmortizacion: string;
  /** HMCPCDCR – Cuota del crédito */
  cuotaCredito: number;
  /** HMCPDVDN – Dividendo */
  dividendo: number;
  /** HMCPFDEC – Fecha de exigibilidad (String) */
  fechaExigibilidad: string;
  /** HMCPVLDG – Valor desgravamen */
  valorDesgravamen: number;
  /** HMCPVLIN – Valor incendio */
  valorIncendio: number;
}
