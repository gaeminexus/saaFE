import { Entidad } from "./entidad";

export interface CambioAporte {
    codigo: number;               // Código del cambio de aporte
    entidad: Entidad;             // Entidad (FK)
    sueldo: number;               // Sueldo
    porcentajeCesantia: number;   // Porcentaje Cesantía
    porcentajeJubilacion: number; // Porcentaje Jubilación
    estadoActual: number;         // Estado Actual
    fechaSolicitud: string;       // Fecha de solicitud (Timestamp)
    fechaAprobacion: string;      // Fecha de aprobación (Timestamp)
    solicitudWeb: number;         // Indica si fue solicitud Web
    usuarioIngreso: string;       // Usuario ingreso
    fechaIngreso: string;         // Fecha ingreso (Timestamp)
    estado: number;               // Estado
}
