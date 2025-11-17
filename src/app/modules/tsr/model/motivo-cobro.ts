import { DetalleAsiento } from "../../cnt/model/detalle-asiento";
import { Cobro } from "./cobro";



export interface MotivoCobro {
    codigo: number;                    // Identificador único del motivo de cobro
    cobro: Cobro;                      // Cobro al que pertenece este motivo
    descripcion: string;               // Descripción del motivo de cobro
    valor: number;                     // Valor correspondiente al motivo
    detallePlantilla: DetalleAsiento; // Detalle de plantilla contable asociada al motivo
}
