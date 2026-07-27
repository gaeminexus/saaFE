import { Periodo } from "../../cnt/model/periodo";
import { CuentaBancaria } from "./cuenta-bancaria";

export interface ConciliacionContable {
    codigo: number;                     // CNCTCDGO
    cuentaBancaria: CuentaBancaria;      // CNBCCDGO
    periodo: Periodo;                   // PRDOCDGO
    estadoRevision: number;             // CNCTESTR - rubro EstadoConciliacionContable
    totalGrupos: number;                // CNCTTTGR
    totalPendientesExtracto: number;    // CNCTPDEX
    totalPendientesAsiento: number;     // CNCTPDAS
    usuarioVerifica: string;            // CNCTUSVR
    fechaVerificacion: string;          // CNCTFCVR
    fechaCreacion: string;              // CNCTFCRG
    estado: number;                     // CNCTESTD - 1 activo, 0 inactivo
}

/**
 * Estados de revision de una ConciliacionContable (rubro EstadoConciliacionContable).
 */
export enum EstadoConciliacionContable {
    PENDIENTE = 1,
    VERIFICADO = 2,
    CON_DIFERENCIAS = 3,
}
