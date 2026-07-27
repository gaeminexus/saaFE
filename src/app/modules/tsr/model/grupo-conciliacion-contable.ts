import { ConciliacionContable } from "./conciliacion-contable";

export interface GrupoConciliacionContable {
    codigo: number;                       // GRCCCDGO
    conciliacionContable: ConciliacionContable; // CNCTCDGO
    valorExtracto: number;                // GRCCVLEX
    valorAsiento: number;                 // GRCCVLAS
    diferencia: number;                   // GRCCDIFF
    fechaMinima: string;                  // GRCCFCMN
    fechaMaxima: string;                  // GRCCFCMX
    toleranciaDiasAplicada: number;       // GRCCTOLD
    usuarioConcilia: string;              // GRCCUSCN
    fechaConciliacion: string;            // GRCCFCCN
    observaciones: string;                // GRCCOBSR
    estado: number;                       // GRCCESTD - 1 activo, 0 deshecho
}
