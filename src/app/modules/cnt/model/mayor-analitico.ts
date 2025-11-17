import { Empresa } from "../../../shared/model/empresa";
import { CentroCosto } from "./centro-costo";
import { PlanCuenta } from "./plan-cuenta";


export interface MayorAnalitico {
  codigo: number;                     // Long → number
  secuencial: number | null;          // Long → number | null
  planCuenta: PlanCuenta | null;      // ManyToOne → puede ser null
  numeroCuenta: string;               // String → string
  nombreCuenta: string;               // String → string
  saldoAnterior: number | null;       // Double → number | null
  empresa: Empresa | null;            // ManyToOne → puede ser null
  observacion: string | null;         // String → puede ser null
  centroCosto: CentroCosto | null;    // ManyToOne → puede ser null
}
