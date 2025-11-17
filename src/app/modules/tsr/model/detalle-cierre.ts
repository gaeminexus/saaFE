import { CierreCaja } from "./cierre-caja";
import { Cobro } from "./cobro";

export interface DetalleCierre {
    codigo: number;               // Identificador único del detalle de cierre
    cierreCaja: CierreCaja;       // Cierre de caja al que pertenece
    cobro: Cobro;                 // Cobro asociado al detalle
    nombreCliente: string;        // Nombre del cliente al que se realizó el cobro
    fechaCobro: string;           // Fecha del cobro (formato ISO: LocalDateTime en Java)
    valorEfectivo: number;        // Valor en efectivo del cobro
    valorCheque: number;          // Valor en cheque del cobro
    valorTarjeta: number;         // Valor en tarjeta del cobro
    valorTransferencia: number;   // Valor en transferencia del cobro
    valorRetencion: number;       // Valor en retención del cobro
    valorTotal: number;           // Valor total del cobro
}
