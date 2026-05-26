import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface SaldoOperacionG48 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  numeroOperacion: string;
  tipoCredito: string;
  diasMorosidad: number;
  calificacionPropia: string;
  tasaInteres: number;
  valorPorVencer: number;
  valorVencido: number;
  costosOperativos: number;
  interesOrdinario: number;
  interesMora: number;
  valorDemandaJudicial: number;
  carteraCastigada: number;
  provisionRequeridaOriginal: number;
  provisionConstituida: number;
  valorTotalCuentaIndividual: number;
  valorSujetoProvision: number;
  tipoSistemaAmortizacion: string;
  cuotaCredito: number;
  dividendo: number;
  fechaExigibilidad: any;
}
