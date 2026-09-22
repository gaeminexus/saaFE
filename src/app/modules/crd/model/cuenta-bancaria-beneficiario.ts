import { Entidad } from "./entidad";
import { BancoExterno } from "../../tsr/model/banco-externo.model";

/**
 * Tabla CRD.CBBP — Cuenta Bancaria Beneficiario (sepelio, fase 2a).
 * `docs/crd/API-BENEFICIARIOS-PARTICIPE.md` §2.1 — contrato congelado.
 *
 * Un beneficiario es a quién se le paga el valor de sepelio cuando el partícipe fallece.
 * NUNCA se borra (§3.5 del contrato: `DELETE` no está implementado a propósito) — se inactiva
 * con `estado = 2` vía `PUT`, porque esta tabla es la prueba de a quién se le pagó o se le iba a
 * pagar la plata de un fallecido.
 */
export interface CuentaBancariaBeneficiario {
    codigo: number;               // CBBPCDGO - PK
    entidad: Entidad;             // ENTDCDGO - FK Entidad (el partícipe fallecido)
    nombre: string;                // CBBPNMBR - Nombre completo del beneficiario
    numeroIdentificacion: string;  // CBBPIDNT - Cédula del beneficiario. El PUT no la cambia (§3.4): otro número es otro beneficiario.
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
