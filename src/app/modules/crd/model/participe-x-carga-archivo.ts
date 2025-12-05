import { DetalleCargaArchivo } from "./detalle-carga-archivo";

export interface ParticipeXCargaArchivo {
    codigo: number;                    // Código del registro
    detalleCargaArchivo: DetalleCargaArchivo;          // Detalle carga archivo (objeto)
    codigoPetro: number;               // Código Petro
    nombre: string;                    // Nombre del partícipe
    plazoInicial: number;              // Plazo inicial
    mesesPlazo: number;                // Meses de plazo
    saldoActual: number;               // Saldo actual
    interesAnual: number;              // Interés anual
    valorSeguro: number;               // Valor seguro
    montoDescontar: number;            // Monto a descontar
    capitalDescontado: number;         // Capital descontado
    interesDescontado: number;         // Interés descontado
    seguroDescontado: number;          // Seguro descontado
    totalDescontado: number;           // Total descontado
    capitalNoDescontado: number;       // Capital no descontado
    interesNoDescontado: number;       // Interés no descontado
    desgravamenNoDescontado: number;   // Desgravamen no descontado
    estadoRevision: number;            // Estado de revisión
    estado: number;                    // Estado del registro

}
