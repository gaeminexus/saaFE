import { TempCobro } from "./temp-cobro";
import { Banco } from "./banco";
import { BancoExterno } from "./banco-externo";
import { CuentaBancaria } from "./cuenta-bancaria";


export interface TempCobroTransferencia {
    codigo: number;                   // Identificador único del cobro con transferencia
    tempCobro: TempCobro;             // Cobro temporal al que pertenece
    bancoExterno: BancoExterno;       // Banco externo desde el cual se realiza la transferencia
    cuentaOrigen: string;             // Número de cuenta origen de la transferencia
    numeroTransferencia: number;      // Número de la transferencia bancaria
    banco: Banco;                     // Banco de la empresa que recibe la transferencia
    cuentaBancaria: CuentaBancaria;   // Cuenta bancaria de la empresa que recibe la transferencia
    cuentaDestino: string;            // Número de cuenta destino de la transferencia
    valor: number;                    // Valor transferido
}
