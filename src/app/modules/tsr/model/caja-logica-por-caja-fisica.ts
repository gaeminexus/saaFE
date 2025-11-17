import { CajaLogica } from "./caja-logica";
import { CajaFisica } from "./caja-fisica";

export interface CajaLogicaPorCajaFisica {
    codigo: number;
    cajaLogica: CajaLogica;
    cajaFisica: CajaFisica;
    estado: number;
    fechaIngreso: string; // o Date, según cómo manejes las fechas en el frontend
}
