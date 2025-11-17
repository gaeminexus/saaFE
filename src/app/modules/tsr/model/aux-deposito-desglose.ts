import { Banco } from "./banco";
import { BancoExterno } from "./banco-externo";
import { Cobro } from "./cobro";
import { CobroCheque } from "./cobro-cheque";
import { CuentaBancaria } from "./cuenta-bancaria";
import { UsuarioPorCaja } from "./usuario-por-caja";

export interface AuxDepositoDesglose {
    codigo: number;
    tipo: number;
    valor: number;
    seleccionado: number;
    cobro: Cobro;
    banco: Banco;
    cuentaBancaria: CuentaBancaria;
    bancoExterno: BancoExterno;
    numeroCheque: number;
    usuarioPorCaja: UsuarioPorCaja;
    cobroCheque: CobroCheque;
}
