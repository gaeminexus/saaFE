import { PlanCuenta } from "../../cnt/model/plan-cuenta";

/**
 * Forma de DetalleAsiento (CNT) tal como la necesita la pantalla de
 * conciliación contable - con el Asiento anidado completo (fechaAsiento,
 * numero) en vez del solo codigo que usa cnt/model/detalle-asiento.ts en
 * otras pantallas. Mismo backend, distinta necesidad de campos.
 */
export interface DetalleAsientoConciliacion {
    codigo: number;
    asiento: {
        codigo: number;
        fechaAsiento: string;
        numero: number;
        observaciones: string;
    };
    planCuenta: PlanCuenta;
    descripcion: string;
    valorDebe: number;
    valorHaber: number;
    nombreCuenta: string;
    numeroCuenta: string;
}
