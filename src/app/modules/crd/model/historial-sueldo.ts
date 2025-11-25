import { Entidad } from "./entidad";

export interface HistorialSueldo {
    codigo: number;               // Código
    entidad: Entidad;             // Entidad (FK)
    sueldo: number;               // Sueldo
    porcentajeCesantia: number;   // Porcentaje Cesantía
    porcentajeJubilacion: number; // Porcentaje Jubilación
    montoJubilacion: number;      // Monto Aporte Jubilación
    montoCesantia: number;        // Monto Aporte Cesantía
    montoAdicional: number;       // Monto Aporte Adicional
    usuarioIngreso: string;       // Usuario ingreso
    fechaIngreso: string;         // Fecha ingreso (Timestamp)
    estado: number;               // Estado
}
