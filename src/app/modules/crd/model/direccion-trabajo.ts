import { Direccion } from "./direccion";
import { Entidad } from "./entidad";

export interface DireccionTrabajo {
    codigo: number;
    direccion: Direccion;
    entidad: Entidad;
}
