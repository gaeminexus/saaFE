import { BancoExterno } from "./banco-externo";
import { Cobro } from "./cobro";
import { DetalleDeposito } from "./detalle-deposito";


export interface CobroCheque {
    codigo: number;                  // Identificador único del cobro con cheque
    cobro: Cobro;                    // Cobro al que pertenece
    bancoExterno: BancoExterno;      // Banco externo del que proviene el cheque
    numero: number;                  // Número del cheque
    valor: number;                   // Valor del cheque
    detalleDeposito: DetalleDeposito;// Detalle de depósito asociado
    estado: number;                  // Estado del cheque
}
