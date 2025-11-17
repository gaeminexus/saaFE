import { Empresa } from "../../../shared/model/empresa";
import { PlanCuenta } from "../../cnt/model/plan-cuenta";


export interface CajaFisica {
    codigo: number;
    empresa: Empresa;
    nombre: string;
    fechaIngreso: string; // o Date, según cómo manejes las fechas en el frontend
    fechaInactivo: string; // o Date
    estado: number;
    planCuenta: PlanCuenta;
}
