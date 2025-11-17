import { Usuario } from "../../../shared/model/usuario";
import { Asiento } from "../../cnt/model/asiento";
import { CuentaBancaria } from "./cuenta-bancaria";
import { MovimientoBanco } from "./movimiento-banco";


export interface DebitoCredito {
    codigo: number;                  // Identificador único del débito/crédito
    cuentaBancaria: CuentaBancaria;  // Cuenta bancaria asociada
    descripcion: string;             // Descripción del movimiento
    tipo: number;                    // Tipo de movimiento: 1 = Débito, 2 = Crédito
    numeroAsiento: number;           // Número del asiento contable
    nombreUsuario: string;           // Nombre del usuario que realiza la transacción
    fecha: Date;                     // Fecha de la transacción
    asiento: Asiento;                // Asiento contable generado
    movimientoBanco: MovimientoBanco;// Movimiento bancario generado
    usuario: Usuario;                // Usuario asociado
    estado: number;                  // Estado: 1 = Activo, 0 = Inactivo
}
