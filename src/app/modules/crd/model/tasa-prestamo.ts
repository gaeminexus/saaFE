import { Producto } from "./producto";

export interface TasaPrestamo {
    codigo: number;          // Código
    codigoSbs: string;       // Código SBS
    nombre: string;          // Nombre
    tasaNominal: number;     // Tasa nominal
    tasaEfectiva: number;    // Tasa efectiva
    producto: Producto;      // Producto (objeto)
    estado: number;          // Estado
    plazoMinimo: number;     // Plazo mínimo
    plazoMaximo: number;     // Plazo máximo
    montoMinimo: number;     // Monto mínimo
    montoMaximo: number;     // Monto máximo
}
