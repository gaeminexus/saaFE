import { PlanCuenta } from "../../cnt/model/plan-cuenta";
import { GrupoCaja } from "./grupo-caja";


export interface CajaLogica {
    codigo: number;
    grupoCaja: GrupoCaja;
    nombre: string;
    planCuenta: PlanCuenta;
    cuentaContable: string;
    fechaIngreso: string; // o Date, según cómo manejes las fechas en el frontend
    fechaInactivo: string; // o Date
    estado: number;
}
