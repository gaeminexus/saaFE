import { TempCobro } from "./temp-cobro";

export interface TempCobroEfectivo {
    codigo: number;       // Identificador único del cobro con efectivo
    tempCobro: TempCobro; // Cobro temporal al que pertenece
    valor: number;        // Valor del cobro en efectivo
}
