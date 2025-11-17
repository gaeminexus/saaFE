import { Asiento } from "./asiento";
import { PlanCuenta } from "./plan-cuenta";


export interface DetalleMayorAnalitico {
    codigo: number;
    mayorAnalitico: number;
    fechaAsiento: Date;
    numeroAsiento: number;
    descripcionAsiento: string;
    valorDebe: number;
    valorHaber: number;
    saldoActual: number;
    asiento: Asiento;
    estadoAsiento: number;
    planCuenta: PlanCuenta;
    nombreCosto: string;
    numeroCentroCosto: string;
}
