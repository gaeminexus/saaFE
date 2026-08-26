import { Entidad } from "./entidad";
import { BancoExterno } from "../../tsr/model/banco-externo.model";

// Tabla CRD.CNBP - Cuenta Bancaria del Partícipe
export interface CuentaBancariaParticipe {
    codigo: number;             // CNBPCDGO - PK
    entidad: Entidad;           // ENTDCDGO - FK Entidad padre
    bancoExterno: BancoExterno; // BEXTCDGO - FK Banco externo (TSR.BEXT)
    tipoCuenta: number;         // CNBPTPCN - codigoAlterno del DetalleRubro (rubro tipo cuenta bancaria)
    numeroCuenta: string;       // CNBPNMRO - Número de cuenta
    estado: number;             // CNBPIDST - 1=activo, 0=inactivo
    // CuentaBancariaParticipe NO ganó ningún campo de certificado (verificado contra
    // ws/rest/crd/CuentaBancariaParticipeRest.java): para saber si una cuenta tiene certificado
    // hay que llamar a GET /cnbp/{id}/certificado — ver AdjuntoCertificadoCnbp más abajo.
}

/**
 * Metadatos del certificado bancario de una cuenta, de `GET /cnbp/{id}/certificado`
 * (verificado contra `ws/rest/crd/CuentaBancariaParticipeRest.java:220`).
 *
 * Ese endpoint responde **404 cuando la cuenta no tiene certificado**: es la respuesta esperada,
 * no un error — nunca mostrarlo como fallo. `CuentaBancariaParticipeService.obtenerCertificado()`
 * ya lo traduce a `null`.
 */
export interface AdjuntoCertificadoCnbp {
    nombreArchivo: string;
    mimeType: string;
    /** `LocalDateTime` del backend: puede llegar como arreglo `[y,m,d,h,mi]` — normalizar con
     *  `FuncionesDatosService`, nunca con el pipe `date` de Angular a secas. */
    fechaRegistro: string | number[] | Date;
}
