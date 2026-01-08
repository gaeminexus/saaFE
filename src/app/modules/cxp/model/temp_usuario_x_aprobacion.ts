import { Usuario } from "../../../shared/model/usuario";
import { TempAprobacionXMonto } from "./temp_aprobacion_x_monto";

export interface TempUsuarioXAprobacion{
    codigo: number;
    tempAprobacionXMonto: TempAprobacionXMonto;
    usuario: Usuario;
    fechaIngreso: Date;
    
}