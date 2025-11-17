import { PlanCuenta } from "./plan-cuenta";


export interface ReporteCuentaCC {
  codigo: number;               // Long → number
  planCuenta: PlanCuenta | null; // ManyToOne → puede ser null
  nombreCuenta: string | null;   // String → string
  numeroCuenta: string | null;   // String → string
  secuencia: number | null;      // Long → number
  saldoAnterio: number | null;   // Long → number
  debe: number | null;           // Long → number
  haber: number | null;          // Long → number
  saldoActual: number | null;    // Long → number
}
