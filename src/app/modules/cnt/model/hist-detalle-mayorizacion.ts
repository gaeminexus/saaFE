import { PlanCuenta } from "./plan-cuenta";

export interface HistDetalleMayorizacion {
    codigo: number;
    histMayorizacion: number;
    planCuenta: PlanCuenta;
    saldoAnterior: number;
    valorDebe: number;
    valorHaber: number;
    saldoActual: number;
    numeroCuenta: string;
    codigoPadreCuenta: number;
    nombreCuenta: string;
    tipoCuenta: number;
    nivelCuenta: number;
    idMayorizacion: number;
}
