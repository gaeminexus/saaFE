import { DetallePlantilla } from "../../cnt/model/detalle-plantilla";
import { TempCobro } from "./temp-cobro";

export interface TempMotivoCobro {
    codigo: number;                   // Identificador único del motivo de cobro temporal
    tempCobro: TempCobro;             // Cobro temporal al que pertenece
    descripcion: string;              // Descripción del motivo de cobro
    valor: number;                    // Valor asociado al motivo de cobro
    detallePlantilla: DetallePlantilla; // Detalle de plantilla contable asociada
}
