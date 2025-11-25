import { Entidad } from "./entidad";
import { Prestamo } from "./prestamo";

export interface Comentario {
    codigo: number;           // Código del comentario
    fecha: string;            // Fecha del comentario (Timestamp)
    funcionario: string;      // Funcionario
    observacion: string;      // Observación
    estadoTexto: string;      // Estado textual
    estado: number;           // ID Estado
    entidad: Entidad;         // Entidad (Partícipe)
    prestamo: Prestamo;       // Préstamo
}
