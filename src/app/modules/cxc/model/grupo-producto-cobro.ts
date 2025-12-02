import { Empresa } from "../../../shared/model/empresa";
import { PlanCuenta } from "../../cnt/model/plan-cuenta";
import { ProductoCobro } from "./producto-cobro";


export interface GrupoProductoCobro {
    codigo: number;                      // Código de la entidad
    nombre: string;                      // Nombre del grupo de productos
    rubroTipoGrupoP: number;            // Rubro para tipo de grupo de producto. Tomado de rubro 74
    rubroTipoGrupoH: number;            // Detalle de rubro para el tipo de grupo de producto. Tomado de rubro 74
    planCuenta: PlanCuenta;             // Cuenta contable asignada al grupo de producto
    estado: number;                      // Estado 1 = activo, 2 = inactivo
    empresa: Empresa;                    // Empresa a la que pertenece el grupo de producto
    productoCobros: ProductoCobro;     // Listado de productos que pertenecen a este grupo
}
