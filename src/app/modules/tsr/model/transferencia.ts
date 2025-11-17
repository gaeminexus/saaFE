import { Banco } from "./banco";
import { CuentaBancaria } from "./cuenta-bancaria";

export interface Transferencia {
    codigo: number;                      // Identificador único de la transferencia
    fecha: Date;                         // Fecha en la que se realiza la transferencia
    tipo: number;                        // Tipo de transferencia (1 = Apertura de cuenta, 0 = Transferencia normal)
    bancoOrigen: Banco;                  // Banco origen desde el que se obtiene el dinero
    cuentaBancariaOrigen: CuentaBancaria; // Cuenta bancaria origen desde la que se transfiere el dinero
    numeroCuentaOrigen: string;          // Número de la cuenta origen
    bancoDestino: Banco;                 // Banco destino al que se deposita el dinero
    cuentaBancariaDestino: CuentaBancaria; // Cuenta bancaria destino donde se deposita el dinero
    numeroCuentaDestino: string;         // Número de la cuenta destino
    valor: number;                       // Valor total de la transferencia
    nombreUsuario: string;               // Nombre del usuario que realiza la transferencia
    observacion: string;                 // Observaciones asociadas a la transferencia
    estado: number;                      // Estado de la transferencia (1 = Activo, 2 = Inactivo)
}
