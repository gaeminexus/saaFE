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
}
