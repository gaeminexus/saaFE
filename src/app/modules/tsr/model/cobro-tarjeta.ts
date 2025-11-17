import { DetallePlantilla } from "../../cnt/model/detalle-plantilla";
import { Cobro } from "./cobro";


export interface CobroTarjeta {
    codigo: number;                 // Identificador único del cobro con tarjeta
    cobro: Cobro;                   // Cobro al que pertenece
    numero: number;                 // Número de la tarjeta o transacción
    valor: number;                  // Valor del cobro con tarjeta
    numeroVoucher: number;          // Número del voucher o comprobante
    fechaCaducidad: string;         // Fecha de caducidad (ISO string en TS)
    detallePlantilla: DetallePlantilla; // Detalle de plantilla contable asociado
}
