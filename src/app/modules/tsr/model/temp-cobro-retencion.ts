import { DetallePlantilla } from "../../cnt/model/detalle-plantilla";
import { Plantilla } from "../../cnt/model/plantilla";
import { TempCobro } from "./temp-cobro";



export interface TempCobroRetencion {
    codigo: number;                   // Identificador único del cobro con retención
    tempCobro: TempCobro;             // Cobro temporal al que pertenece
    plantilla: Plantilla;             // Plantilla contable utilizada para la retención
    detallePlantilla: DetallePlantilla; // Detalle de la plantilla asociada
    valor: number;                    // Valor de la retención
    numero: string;                   // Número del comprobante de retención
}
