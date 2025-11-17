import { DetalleMayorizacionCC } from "./detalle-mayorizacion-cc";
import { PlanCuenta } from "./plan-cuenta";

export interface DesgloseMayorizacionCC {
    codigo: number;
    detalleMayorizacionCC: DetalleMayorizacionCC;
    planCuenta: PlanCuenta;
    valorDebe: number;
    valorHaber: number;
    numeroCuenta: string;
    codigoPadreCuenta: number;
    nombreCuenta: string;
    tipoCuenta: number;
    nivelCuenta: number;
}
