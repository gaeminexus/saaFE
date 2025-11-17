import { Empresa } from "../../../shared/model/empresa";
import { Usuario } from "../../../shared/model/usuario";
import { DetallePlantilla } from "../../cnt/model/detalle-plantilla";

export interface TempDebitoCredito {
    codigo: number;                  // Identificador único del débito/crédito
    tipo: number;                    // Tipo de movimiento: 1 = Débito, 2 = Crédito
    usuario: Usuario;                // Usuario que realiza el movimiento
    detallePlantilla: DetallePlantilla; // Detalle de plantilla contable asociada
    descripcion: string;             // Descripción del movimiento
    valor: number;                   // Valor del movimiento
    empresa: Empresa;                // Empresa en la que se realiza el movimiento
}
