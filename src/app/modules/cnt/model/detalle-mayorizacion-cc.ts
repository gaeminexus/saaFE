
import { Empresa } from "../../../shared/model/empresa";
import { CentroCosto } from "./centro-costo";

export interface DetalleMayorizacionCC {
    codigo: number;
    mayorizacionCC: number;
    centroCosto: CentroCosto;
    numeroCC: string;
    nombreCC: string;
    saldoAnterior: number;
    empresa: Empresa;
    saldoActual: number;
    valorDebe: number;
    valorHaber: number;
}
