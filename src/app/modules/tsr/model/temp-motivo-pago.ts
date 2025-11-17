import { DetallePlantilla } from "../../cnt/model/detalle-plantilla";
import { Plantilla } from "../../cnt/model/plantilla";
import { TempPago } from "./temp-pago";


export interface TempMotivoPago {
    codigo: number;                     // Identificador único del motivo de pago temporal
    tempPago: TempPago;                 // Pago temporal al que pertenece
    plantilla: Plantilla;               // Plantilla asociada al motivo de pago
    detallePlantilla: DetallePlantilla; // Detalle de plantilla contable asociada
    descripcion: string;                // Descripción del motivo de pago
    valor: number;                      // Valor correspondiente al motivo de pago
}
