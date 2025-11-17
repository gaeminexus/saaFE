import { Usuario } from "../../../shared/model/usuario";
import { CajaFisica } from "./caja-fisica";


export interface UsuarioPorCaja {
    codigo: number;           // Identificador único del registro
    cajaFisica: CajaFisica;   // Caja física a la que está asignado el usuario
    nombre: string;           // Nombre completo del usuario asignado a la caja
    usuario: Usuario;         // Usuario del sistema asociado a la caja
    fechaIngreso: Date;       // Fecha en la que el usuario fue asignado a la caja
    fechaInactivo: Date;      // Fecha de desactivación del usuario en la caja
    estado: number;           // Estado del registro (1 = Activo, 2 = Inactivo)
}
