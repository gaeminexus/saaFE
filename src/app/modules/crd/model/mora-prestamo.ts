import { TipoPrestamo } from "./tipo-prestamo";

export interface MoraPrestamo {
    codigo: number;            // Código
    tipoPrestamo: TipoPrestamo; // Tipo de préstamo (objeto)
    diasMinimo: number;        // Días mínimo
    diasMaximo: number;        // Días máximo
    porcentajeMora: number;    // Porcentaje mora
    tasaAnual: number;         // Tasa anual
}
