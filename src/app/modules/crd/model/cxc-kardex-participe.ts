import { CxcParticipe } from "./cxc-participe";

export interface CxcKardexParticipe {
    codigo: number;
    cxcp: CxcParticipe;
    idTransaccion: number;
    idCuenta: number;
    totalDebito: number;
    totalCredito: number;
    saldoActual: number;
    concepto: string;
    fechaCreado: string;
}
