import { DetallePlantilla } from "../../cnt/model/detalle-plantilla";
import { DebitoCredito } from "./debito-credito";

export interface DetalleDebitoCredito {
    codigo: number;                  // Identificador único del detalle de débito/crédito
    debitoCredito: DebitoCredito;    // Débito o crédito al que pertenece el detalle
    detallePlantilla: DetallePlantilla; // Detalle de plantilla para obtener la cuenta contable
    descripcion: string;             // Descripción del detalle
    valor: number;                   // Valor del movimiento (débito o crédito)
}
