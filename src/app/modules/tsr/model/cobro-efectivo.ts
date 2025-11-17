import { Cobro } from "./cobro";

export interface CobroEfectivo {
    codigo: number;   // Identificador único del cobro en efectivo
    cobro: Cobro;     // Cobro al que pertenece
    valor: number;    // Valor del cobro en efectivo
}
