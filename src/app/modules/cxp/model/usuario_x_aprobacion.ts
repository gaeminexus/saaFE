import { Usuario } from "../../../shared/model/usuario";
import { AprobacionXMonto } from "./aprobacion_x_monto";

export interface UsuarioXAprobacion{
    codigo: number;
    aprobacionXMonto: AprobacionXMonto;
    usuario: Usuario;
    fechaIngreso: Date;
    
}