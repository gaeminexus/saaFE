import { Establecimiento } from './establecimientos';

export interface PuntoEmision {
    id: number;
    codigo: string;
    establecimiento: Establecimiento;
    nombre: string;
    creado: Date;
    observacion: string;
    transportista: number;
    estado: number;
}
