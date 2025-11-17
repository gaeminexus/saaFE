import { CuentaBancaria } from "./cuenta-bancaria";


export interface Chequera {
    codigo: number;
    fechaSolicitud: string;       // o Date, según cómo manejes las fechas en el frontend
    fechaEntrega: string;         // o Date
    numeroCheques: number;
    comienza: number;
    finaliza: number;
    cuentaBancaria: CuentaBancaria;
    rubroEstadoChequeraP: number;
    rubroEstadoChequeraH: number;
}
