import { DetalleAsientoConciliacion } from "./detalle-asiento-conciliacion";
import { GrupoConciliacionContable } from "./grupo-conciliacion-contable";

export interface GrupoConciliacionAsiento {
    codigo: number;                             // GCASCDGO
    grupo: GrupoConciliacionContable;           // GRCCCDGO
    detalleAsiento: DetalleAsientoConciliacion; // DTASCDGO
}
