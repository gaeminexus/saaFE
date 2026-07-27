export interface SugerenciaConciliacionContable {
    idsDetalleExtracto: number[];
    idsDetalleAsiento: number[];
    valorExtracto: number;
    valorAsiento: number;
    fechaMinima: string;
    fechaMaxima: string;
    descripcionResumen: string;
}
