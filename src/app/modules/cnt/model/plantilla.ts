import { Empresa } from "../../../shared/model/empresa";

export interface Plantilla {
    codigo: number;
    nombre: string;
    alterno: number;
    estado: number;
    empresa: Empresa;
    observacion: string;
    fechaInactivo: Date;
}
