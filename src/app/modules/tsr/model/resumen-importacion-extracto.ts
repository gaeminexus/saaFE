export interface ResumenImportacionExtracto {
    idCuentaBancaria: number;
    idPeriodo: number;
    nombrePeriodo: string;
    nombreBanco: string;
    numeroCuenta: string;
    archivoNombre: string;
    formatoDetectado: string;
    fechaDesde: string;
    fechaHasta: string;
    saldoInicial: number;
    saldoFinal: number;
    totalFilas: number;
    totalDebito: number;
    totalCredito: number;
    advertencias: string[];
    // Filas fuera del primerDia/ultimoDia del periodo elegido (p.ej. corte de
    // fin de mes) - informativo, nunca bloqueante.
    totalTransaccionesFueraPeriodo: number;
    transaccionesFueraPeriodo: string[];
    archivoYaCargado: boolean;
    idExtractoExistente: number | null;
    idExtractoCreado?: number | null;
}
