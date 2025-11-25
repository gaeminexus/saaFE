import { Ciudad } from "./ciudad";

export interface Parroquia {
    codigo: number;          // Código
    ciudad: Ciudad;          // Ciudad (FK)
    nombre: string;          // Nombre de la parroquia
    usuarioIngreso: string;  // Usuario de ingreso
    fechaIngreso: string;    // Fecha de ingreso (Timestamp)
    codigoExterno: string;   // Código externo
    estado: number;          // Estado
}
