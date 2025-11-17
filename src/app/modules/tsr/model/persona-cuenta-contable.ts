import { Empresa } from "../../../shared/model/empresa";
import { PlanCuenta } from "../../cnt/model/plan-cuenta";
import { Persona } from "./persona";


export interface PersonaCuentaContable {
    codigo: number;            // Identificador único del registro
    persona: Persona;          // Persona a la que pertenece la cuenta contable
    empresa: Empresa;          // Empresa a la que pertenecen las cuentas contables
    tipoCuenta: number;        // Tipo de cuenta: 1 = Facturas, 2 = Anticipos
    tipoPersona: number;       // 1 = Cliente, 2 = Proveedor
    planCuenta: PlanCuenta;    // Cuenta contable asociada
}
