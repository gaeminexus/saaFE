import { Empresa } from "../../../shared/model/empresa";

export interface TempMontoAprobacion{
    codigo: number;
    valorDesde: number;
    valorHasta: number;
    fechaIngreso: Date;
    usuarioIngresa: String;
    empresa: Empresa;
    
}