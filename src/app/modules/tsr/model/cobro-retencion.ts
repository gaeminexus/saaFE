import { DetallePlantilla } from "../../cnt/model/detalle-plantilla";
import { Plantilla } from "../../cnt/model/plantilla";
import { Cobro } from "./cobro";


export interface CobroRetencion {
    codigo: number;                    // Identificador único del cobro con retención
    cobro: Cobro;                      // Cobro al que pertenece
    plantilla: Plantilla;              // Plantilla contable asociada
    detallePlantilla: DetallePlantilla  ;// Detalle de plantilla asociado
    valor: number;                     // Valor de la retención
    numero: string;                    // Número de documento de la retención
}
