import { Periodo } from "./periodo";


export interface MayorizacionCC {
  codigo: number;          // Long → number
  periodo: Periodo | null; // ManyToOne → puede ser null
  fecha: Date | null;      // Date → Date, puede ser null si no está inicializada
}
