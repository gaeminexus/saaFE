import { Cobro } from "./cobro";
import { Banco } from "./banco";
import { BancoExterno } from "./banco-externo";
import { CuentaBancaria } from "./cuenta-bancaria";

export interface CobroTransferencia {
    codigo: number;               // Identificador único de la transferencia
    cobro: Cobro;                 // Cobro al que pertenece
    bancoExterno: BancoExterno;   // Banco externo desde el cual se realiza la transferencia
    cuentaOrigen: string;         // Cuenta de origen de la transferencia
    numeroTransferencia: number;  // Número o código de transferencia
    banco: Banco;                 // Banco destino de la empresa
    cuentaBancaria: CuentaBancaria; // Cuenta bancaria destino
    cuentaDestino: string;        // Número de cuenta destino
    valor: number;                // Valor monetario de la transferencia
}
