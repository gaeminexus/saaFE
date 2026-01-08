import { Empresa } from "../../../shared/model/empresa";
import { PlanCuenta } from "../../cnt/model/plan-cuenta";

export interface GrupoProductoPago{
    codigo: number;
    nombre:String;
    rubroTipoGrupoP: number;
    rubroTipoGrupoH: number;
    planCuenta: PlanCuenta;
    estado: number;
    empresa: Empresa;
        

}