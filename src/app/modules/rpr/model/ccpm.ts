/** CCPM - Crédito Cuotas Préstamos Mensual (similar a G48 con campos adicionales) */
export interface Ccpm {
  /** CCPMCDGO – Código único del registro (Identity) */
  codigo: number | null;
  /** CCPMTIDS – Tipo de identificación del sujeto */
  tipoIdentificacion: string;
  /** CCPMIDSJ – Identificación del sujeto */
  identificacion: string;
  /** CCPMNMOP – Número de operación */
  numeroOperacion: string;
  /** CCPMTPCR – Tipo de crédito */
  tipoCredito: string;
  /** CCPMDDMR – Días de morosidad */
  diasMorosidad: number;
  /** CCPMCLPR – Calificación propia */
  calificacionPropia: string;
  /** CCPMTDIN – Tasa de interés */
  tasaInteres: number;
  /** CCPMVPVN – Valor por vencer */
  valorPorVencer: number;
  /** CCPMCV30 – Capital por vencer en 1 a 30 días */
  capitalPorVencer1a30: number;
  /** CCPMCV90 – Capital por vencer en 31 a 90 días */
  capitalPorVencer31a90: number;
  /** CCPMCV180 – Capital por vencer en 91 a 180 días */
  capitalPorVencer91a180: number;
  /** CCPMCV360 – Capital por vencer en 181 a 360 días */
  capitalPorVencer181a360: number;
  /** CCPMCVMAS – Capital por vencer a más de 360 días */
  capitalPorVencerMas360: number;
  /** CCPMCVES – Estado de consistencia del desglose (1=OK, 2=DIFERENCIA) */
  estadoDesglose: number;
  /** CCPMVLVN – Valor vencido */
  valorVencido: number;
  /** CCPMCSPR – Costos operativos */
  costosOperativos: number;
  /** CCPMINRD – Interés ordinario */
  interesOrdinario: number;
  /** CCPMISMR – Interés sobre mora */
  interesMora: number;
  /** CCPMVEDJ – Valor en demanda judicial */
  valorDemandaJudicial: number;
  /** CCPMCRCS – Cartera castigada */
  carteraCastigada: number;
  /** CCPMPRRO – Provisión requerida original */
  provisionRequeridaOriginal: number;
  /** CCPMPRCN – Provisión constituida */
  provisionConstituida: number;
  /** CCPMVTCI – Valor total cuenta individual */
  valorTotalCuentaIndividual: number;
  /** CCPMVSAP – Valor sujeto a provisión */
  valorSujetoProvision: number;
  /** CCPMTDSA – Tipo de sistema de amortización */
  tipoSistemaAmortizacion: string;
  /** CCPMCDCR – Cuota del crédito */
  cuotaCredito: number;
  /** CCPMDVDN – Dividendo */
  dividendo: number;
  /** CCPMFDEC – Fecha de exigibilidad de la cuota */
  fechaExigibilidad: any;
  /** CCPMVLDG – Valor desgravamen (campo adicional vs G48) */
  valorDesgravamen: number;
  /** CCPMVLIN – Valor incendio (campo adicional vs G48) */
  valorIncendio: number;
  /** CCPMEJCC – FK a control de ejecución (RPR.EJCC) */
  ejecucionReporte: { codigo: number; mes: number; anio: number };

  fechaPrestamo: any; // Fecha de desembolso del préstamo (campo adicional vs G48)
}
