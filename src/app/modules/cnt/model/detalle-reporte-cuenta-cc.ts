import { CentroCosto } from "./centro-costo";

export interface DetalleReporteCuentaCC {
    codigo: number;
    reporteCuentaCC: number;
    centroCosto: CentroCosto;
    nombreCosto: string;
    numeroCosto: string;
    debe: number;
    haber: number;
}
