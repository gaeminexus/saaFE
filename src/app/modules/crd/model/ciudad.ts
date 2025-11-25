import { Provincia } from "./provincia";

export interface Ciudad {
    codigo: number;           // Código
    provincia: Provincia;     // Provincia (objeto)
    nombre: string;           // Nombre de la ciudad
    codigoAlterno: string;    // Código alterno
    fechaIngreso: string;     // Fecha de ingreso (Timestamp)
    usuarioIngreso: string;   // Usuario de ingreso
    codigoExterno: string;    // Código externo
    estado: number;           // Estado
}
