import { PuntoEmision } from './puntos-emision';

export interface NumeracionPuntoEmision {
    id: number;
    ptoEmision: PuntoEmision;
    tipoDoc: string;
    numActual: number;
}
