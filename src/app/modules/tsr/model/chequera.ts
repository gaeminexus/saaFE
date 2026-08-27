import { CuentaBancaria } from "./cuenta-bancaria";

/**
 * Chequera. `numeroCheques` sigue existiendo por el flujo legado de
 * solicitud-chequera (que la fija al solicitar); el flujo nuevo de
 * recepción (`POST /chqr/registrarRecepcion`) solo envía comienza/finaliza
 * y el backend infiere el total.
 */
export interface Chequera {
    codigo: number;
    fechaSolicitud?: string;       // o Date, según cómo manejes las fechas en el frontend
    fechaEntrega?: string;         // o Date
    numeroCheques?: number;
    comienza: number;
    finaliza: number;
    cuentaBancaria: CuentaBancaria;
    rubroEstadoChequeraP?: number;
    rubroEstadoChequeraH?: number;
}

/** Respuesta de GET /chqr/sugerirInicio/{idCuenta}. */
export interface ChequeraSugerirInicio {
    siguiente: number;
}

/** Body de POST /chqr/registrarRecepcion. */
export interface ChequeraRegistrarRecepcionRequest {
    idCuentaBancaria: number;
    comienza: number;
    finaliza: number;
    /** ISO local sin zona: yyyy-MM-ddTHH:mm:ss. */
    fechaEntrega: string;
    idUsuario: number;
}

/** Respuesta de POST /chqr/anular/{id}. */
export interface ChequeraAnularResponse {
    mensaje: string;
}

/** Respuesta de GET /chqr/resumen/{idChequera}. */
export interface ChequeraResumen {
    comienza: number;
    finaliza: number;
    total: number;
    disponibles: number;
    generados: number;
    impresos: number;
    entregados: number;
    anulados: number;
    siguiente: number;
}
