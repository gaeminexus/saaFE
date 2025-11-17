import { CierreCaja } from "./cierre-caja";
import { UsuarioPorCaja } from "./usuario-por-caja";

export interface AuxDepositoCierre {
    codigo: number;
    cierreCaja: CierreCaja;
    usuarioPorCaja: UsuarioPorCaja;
    montoEfectivo: number;
    montoCheque: number;
    seleccionado: number;
    montoDeposito: number;
    montoTotalCierre: number;
    fechaCierre: string; // o Date, según cómo manejes las fechas en tu frontend
    nombreCaja: string;
}
