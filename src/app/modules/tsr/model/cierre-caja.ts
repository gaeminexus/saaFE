import { Asiento } from "../../cnt/model/asiento";
import { Deposito } from "./deposito";
import { UsuarioPorCaja } from "./usuario-por-caja";


export interface CierreCaja {
    codigo: number;
    usuarioPorCaja: UsuarioPorCaja;
    fechaCierre: string;            // o Date, si se maneja como objeto de fecha
    nombreUsuario: string;
    monto: number;
    rubroEstadoP: number;
    rubroEstadoH: number;
    montoEfectivo: number;
    montoCheque: number;
    montoTarjeta: number;
    montoTransferencia: number;
    montoRetencion: number;
    deposito: Deposito;
    asiento: Asiento;
}
