import { Prestamo } from "./prestamo";

export interface RelacionPrestamo {
    codigo: number;              // Código
    prestamoHijo: Prestamo;      // Préstamo hijo (objeto)
    prestamoPadre: Prestamo;     // Préstamo padre (objeto)
    tipo: string;                // Tipo
    fechaRegistro: string;       // Fecha registro (Timestamp)
    usuarioRegistro: string;     // Usuario registro
    estado: number;              // Estado
}
