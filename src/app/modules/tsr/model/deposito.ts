import { Empresa } from "../../../shared/model/empresa";
import { Usuario } from "../../../shared/model/usuario";
import { Asiento } from "../../cnt/model/asiento";
import { UsuarioPorCaja } from "./usuario-por-caja";


export interface Deposito {
    codigo: number;               // Identificador único del depósito
    totalEfectivo: number;        // Total en efectivo del depósito
    totalCheque: number;          // Total en cheques del depósito
    totalDeposito: number;        // Total general del depósito
    nombreUsuario: string;        // Nombre del usuario que realiza el depósito
    fechaDeposito: Date;          // Fecha en la que se realiza el depósito
    usuario: Usuario;             // Usuario que realiza el depósito
    empresa: Empresa;             // Empresa a la que pertenece el depósito
    estado: number;               // Estado del depósito (1 = Activo, 0 = Inactivo)
    usuarioPorCaja: UsuarioPorCaja; // Usuario por caja que realiza el depósito
    asiento: Asiento;             // Asiento contable asociado al depósito
}
