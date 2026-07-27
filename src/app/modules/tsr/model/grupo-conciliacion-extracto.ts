import { DetalleExtractoBancario } from "./detalle-extracto-bancario";
import { GrupoConciliacionContable } from "./grupo-conciliacion-contable";

export interface GrupoConciliacionExtracto {
    codigo: number;                                  // GCEXCDGO
    grupo: GrupoConciliacionContable;                // GRCCCDGO
    detalleExtractoBancario: DetalleExtractoBancario; // DEXBCDGO
}
