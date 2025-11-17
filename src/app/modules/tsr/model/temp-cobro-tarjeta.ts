import { DetallePlantilla } from "../../cnt/model/detalle-plantilla";
import { TempCobro } from "./temp-cobro";


export interface TempCobroTarjeta {
    codigo: number;                    // Identificador único del cobro con tarjeta
    tempCobro: TempCobro;              // Cobro temporal al que pertenece
    numero: number;                    // Número de la tarjeta de crédito
    valor: number;                     // Valor del cobro con tarjeta
    numeroVoucher: number;             // Número del comprobante (voucher)
    fechaCaducidad: Date;              // Fecha de caducidad de la tarjeta
    detallePlantilla: DetallePlantilla; // Detalle de la plantilla contable asociada
}
