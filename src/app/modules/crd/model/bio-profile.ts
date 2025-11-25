import { Entidad } from "./entidad";

export interface BioProfile {
    codigo: number;            // Código
    identificacion: string;    // Identificación
    entidad: Entidad;          // Entidad (objeto)
    fechaRegistro: string;     // Fecha de registro (Timestamp)
    estado: number;            // Estado
}
