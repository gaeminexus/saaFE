// Interfaz para la tabla TransaccionesAsoprep (TPVV)
export interface TransaccionesAsoprep {
    codigo: number;
    cuentaId: number;
    concepto: String;
    saldoAnterior: number;
    totalDebito: number;
    totalCredito: number;
    saldoActual: number;
    diferencia: number;
    fechaDeposito: Date;
    fechaAporte: Date;
    debito: number;
    credito: number;
}
