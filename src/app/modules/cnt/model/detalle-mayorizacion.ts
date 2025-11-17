import { PlanCuenta } from "./plan-cuenta";

export interface DetalleMayorizacion {
    codigo: number;
    mayorizacion: number;
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
}
