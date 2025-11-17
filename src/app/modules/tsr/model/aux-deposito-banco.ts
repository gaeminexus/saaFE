import { Banco } from "./banco";
import { CuentaBancaria } from "./cuenta-bancaria";
import { UsuarioPorCaja } from "./usuario-por-caja";

export interface AuxDepositoBanco {
    codigo: number;
    banco: Banco;
    cuentaBancaria: CuentaBancaria;
    usuarioPorCaja: UsuarioPorCaja;
    valor: number;
    valorEfectivo: number;
    valorCheque: number;
}
