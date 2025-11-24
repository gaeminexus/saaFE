export interface TipoPrestamo {
    codigo: number;          // TPPRCDGO - Código
    nombre: string;          // TPPRNMBR - Nombre del tipo de préstamo
    codigoSBS: string;       // TPPRCSPB - Código Superintendencia de Bancos SBS
    tipo: string;           // TPPRTPOO - Tipo (opcional)
    tasa: number;           // TPPRTSAA - Tasa (opcional)
    estado: number;        // TPPRIDST - ID Estado
}
