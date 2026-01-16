export interface AporteAsoprep {
    cuenta: number;
    institucion: number;
    producto: number;
    numeroCuenta: number;
    fechaApertura: Date;
    saldoCuenta: number;
    saldoAporte: number;
    saldoInteres: number;
    fechaUltProvision: Date;
    observaciones: String;
    estado: number;
    creadoPor: number;
    fechaCreado: Date;
    actualizadoPor: number;
    fechaActualiza: Date;
    cliente: number;
    fechaLiquida: Date;
    fechaUltMovimiento: Date;
    regimen: number;
    valorUltAporte: number;
    numeroAporte: number;
    fechaRenuncia: Date;
    numeroSolicitud: String;
    tipoLiquidacion: number;
    acumular: number;

}
