import { Prestamo } from "./prestamo";

export interface DatosPrestamo {
    codigo: number;              // Código
    prestamo: Prestamo;          // Préstamo (objeto)
    totalSalario: number;        // Total Salario
    totalEgresos: number;        // Total Egresos
    otrosIngresosRol: number;    // Otros ingresos ROL
    otrosIngresosExternos: number; // Otros ingresos externos
    fechaRegistro: string;       // Fecha registro (Timestamp)
    usuarioRegistro: string;     // Usuario registro
    estado: number;              // Estado
}
