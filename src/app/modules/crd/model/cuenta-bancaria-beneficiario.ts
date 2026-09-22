import { Entidad } from "./entidad";
import { BancoExterno } from "../../tsr/model/banco-externo.model";

/**
 * Tabla CRD.CBBP — Cuenta Bancaria Beneficiario (sepelio, fase 2a).
 * `docs/crd/API-BENEFICIARIOS-PARTICIPE.md` §2.1 — contrato congelado.
 *
 * Un beneficiario es a quién se le paga el valor de sepelio cuando el partícipe fallece.
 * Se puede **desactivar** (`estado = 2` vía `PUT`) o **eliminar de verdad** (`DELETE`, borra
 * también el certificado adjunto) — decisión del usuario, actualiza al §3.5 original del
 * contrato que decía que no había `DELETE`.
 */
export interface CuentaBancariaBeneficiario {
    codigo: number;               // CBBPCDGO - PK
    entidad: Entidad;             // ENTDCDGO - FK Entidad (el partícipe fallecido). El PUT no la cambia.
    nombre: string;                // CBBPNMBR - Nombre completo del beneficiario
    numeroIdentificacion: string;  // CBBPIDNT - Cédula del beneficiario. Editable por PUT (decisión del usuario); 409 si ya existe otro beneficiario con esa identificación PARA ESE PARTÍCIPE.
    bancoExterno: BancoExterno;    // BEXTCDGO - FK Banco externo (TSR.BEXT)
    tipoCuenta: number;            // CBBPTPCN - codigoAlterno del DetalleRubro, mismo catálogo que CNBPTPCN
    numeroCuenta: string;          // CBBPNMRO
    /**
     * CBBPPRCN - NUMBER(5,2), rango (0, 100]. **NO se valida que sume 100 al guardar** (§4 del
     * contrato): si se exigiera, no se podría cargar al primer beneficiario. La guarda dura del
     * 100% vive en el pago (fase 2b, todavía bloqueada). Solo cuentan los ACTIVOS para el acumulado.
     */
    porcentaje: number;
    estado: number;                // CBBPIDST - 1 activo, 2 inactivo
    usuarioRegistro: string;       // CBBPUSRG
    /** `LocalDate` del backend: normalizar con `FuncionesDatosService.convertirFechaDesdeBackend()`. */
    fechaRegistro: string | number[] | Date;
}

/**
 * Metadatos del certificado bancario de un beneficiario, de `GET /cbbp/{id}/certificado`.
 * Mismo contrato que `AdjuntoCertificadoCnbp` de cuenta bancaria del partícipe.
 *
 * Ese endpoint responde **404 cuando el beneficiario no tiene certificado**: es la respuesta
 * esperada, no un error — nunca mostrarlo como fallo.
 * `CuentaBancariaBeneficiarioService.obtenerCertificado()` ya lo traduce a `null`.
 */
export interface AdjuntoCertificadoCbbp {
    nombreArchivo: string;
    mimeType: string;
    /** `LocalDateTime` del backend: puede llegar como arreglo `[y,m,d,h,mi]` — normalizar con
     *  `FuncionesDatosService`, nunca con el pipe `date` de Angular a secas. */
    fechaRegistro: string | number[] | Date;
}
