import { Empresa } from "../../../shared/model/empresa";
import { PlanCuenta } from "./plan-cuenta";

export interface MatchCuenta {
    codigo: number;
    empresaOrigen: Empresa;
    cuentaOrigen: PlanCuenta;
    empresaDestino: Empresa;
    cuentaDestino: PlanCuenta;
    estado: number;
}
