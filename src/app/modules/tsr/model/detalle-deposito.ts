import { Deposito } from "./deposito";
import { Banco } from "./banco";
import { CuentaBancaria } from "./cuenta-bancaria";
import { Asiento } from "../../cnt/model/asiento";
import { Usuario } from "../../../shared/model/usuario";


export interface DetalleDeposito {
    codigo: number;              // Identificador único del detalle de depósito
    deposito: Deposito;          // Depósito al que pertenece el detalle
    banco: Banco;                // Banco al que se envió parte o total del depósito
    cuentaBancaria: CuentaBancaria; // Cuenta bancaria a la que se envió parte o total del depósito
    valor: number;               // Valor total enviado a esta cuenta bancaria
    valorEfectivo: number;       // Valor en efectivo enviado a esta cuenta bancaria
    valorCheque: number;         // Valor en cheque enviado a esta cuenta bancaria
    estado: number;              // Estado del depósito (0 = Enviado, 1 = Ratificado)
    fechaEnvio: string;          // Fecha de envío del depósito (formato ISO)
    fechaRatificacion: string;   // Fecha de ratificación del depósito (formato ISO)
    numeroDeposito: string;      // Número de depósito
    asiento: Asiento;            // Asiento contable ligado a la emisión del cheque
    usuario: Usuario;            // Usuario que realizó la ratificación
    nombreUsuario: string;       // Nombre del usuario que realizó la ratificación
}
