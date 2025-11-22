import { CargaArchivo } from "./carga-archivo";

export interface DetalleCargaArchivo {
    codigo: number;                       // Código
    cargaArchivo: CargaArchivo;                    // Carga Archivo (objeto)
    codigoPetroProducto: string;          // Código Petro Producto
    nombreProductoPetro: string;          // Nombre Producto Petro
    totalParticipes: number;              // Total partícipes por producto
    totalSaldoActual: number;             // Total Saldo Actual
    totalInteresAnual: number;            // Total Interés Anual
    totalValorSeguro: number;             // Total Valor Seguro
    totalDescontar: number;               // Total Descontar
    totalCapitalDescontado: number;       // Total Capital Descontado
    totalInteresDescontado: number;       // Total Interés Descontado
    totalSeguroDescontado: number;        // Total Seguro Descontado
    totalDescontado: number;              // Total Descontado
    totalCapitalNoDescontado: number;     // Total Capital No Descontado
    totalInteresNoDescontado: number;     // Total Interés No Descontado
    totalDesgravamenNoDescontado: number; // Total Desgravamen No Descontado
    estado: number;                       // Estado del registro
}
