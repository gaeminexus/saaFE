import { CentroCosto } from "./centro-costo";
import { HistAsiento } from "./hist-asiento";
import { PlanCuenta } from "./plan-cuenta";

export interface HistDetalleAsiento {
    codigo: number;
    histAsiento: HistAsiento;
    planCuenta: PlanCuenta;
    descripcion: string;
    valorDebe: number;
    valorHaber: number;
    nombreCuenta: string;
    centroCosto: CentroCosto;
    numeroCuenta: string;
}
