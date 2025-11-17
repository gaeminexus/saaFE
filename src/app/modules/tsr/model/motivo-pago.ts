import { DetallePlantilla } from "../../cnt/model/detalle-plantilla";
import { Plantilla } from "../../cnt/model/plantilla";
import { Pago } from "./pago";

export interface MotivoPago {
    codigo: number;                    // Identificador único del motivo de pago
    pago: Pago;                        // Pago al que pertenece este motivo
    plantilla: Plantilla;              // Plantilla contable asociada al motivo
    detallePlantilla: DetallePlantilla; // Detalle de plantilla para el motivo de pago
    descripcion: string;               // Descripción del motivo de pago
    valor: number;                     // Valor correspondiente al motivo de pago
}
