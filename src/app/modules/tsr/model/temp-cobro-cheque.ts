import { TempCobro } from "./temp-cobro";
import { BancoExterno } from "./banco-externo";


export interface TempCobroCheque {
    codigo: number;             // Identificador único del cobro con cheque
    tempCobro: TempCobro;       // Cobro temporal al que pertenece
    bancoExterno: BancoExterno; // Banco externo del cual proviene el cheque
    numero: number;             // Número de cheque
    valor: number;              // Valor del cheque
}
