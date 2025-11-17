import { Empresa } from "../../../shared/model/empresa";


export interface ReporteContable {
  codigo: number;          // Long → number
  empresa: Empresa | null; // ManyToOne → puede ser null
  nombreReporte: string | null; // String → string
  estado: number | null;        // Long → number
  codigoAlterno: number | null; // Long → number
}
