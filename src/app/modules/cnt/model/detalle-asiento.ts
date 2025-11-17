import { CentroCosto } from "./centro-costo";
import { PlanCuenta } from "./plan-cuenta";

export interface DetalleAsiento {
    codigo: number;
    asiento: number;
    planCuenta: PlanCuenta;
    descripcion: string;
    valorDebe: number;
    valorHaber: number;
    nombreCuenta: string;
    centroCosto: CentroCosto;
    numeroCuenta: string;
}
