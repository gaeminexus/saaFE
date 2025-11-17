import { BancoExterno } from "./banco-externo";
import { Cobro } from "./cobro";
import { CobroCheque } from "./cobro-cheque";
import { DetalleDeposito } from "./detalle-deposito";


export interface DesgloseDetalleDeposito {
    codigo: number;                 // Identificador único del desglose
    detalleDeposito: DetalleDeposito; // Detalle de depósito al que pertenece
    tipo: number;                   // Tipo de depósito: 1 = Efectivo, 2 = Cheque
    valor: number;                  // Valor del desglose
    cobro: Cobro;                   // Cobro al que hace referencia el desglose
    bancoExterno: BancoExterno;     // Banco externo de origen (para cobros con cheque)
    numeroCheque: number;           // Número de cheque con el que se realizó el cobro
    cobroCheque: CobroCheque;       // Cobro con cheque asociado al desglose
}
