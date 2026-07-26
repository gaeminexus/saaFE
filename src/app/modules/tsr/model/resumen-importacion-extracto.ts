export interface ResumenImportacionExtracto {
    idCuentaBancaria: number;
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
    archivoYaCargado: boolean;
    idExtractoExistente: number | null;
    idExtractoCreado?: number | null;
}
