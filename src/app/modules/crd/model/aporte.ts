import { Contrato } from "./contrato";
import { Entidad } from "./entidad";
import { Filial } from "./filial";
import { TipoAporte } from "./tipo-aporte";

export interface Aporte {
    codigo: number;               // APRTCDGO - Código
    filial: Filial;         // FLLLCDGO - ID Filial
    entidad: Entidad;        // ENTDCDGO - ID Entidad
    contrato: Contrato;       // CNTRCDGO - ID Contrato
    tipoAporte: TipoAporte;     // TPAPCDGO - FK Tipo Aporte
    fechaTransaccion: Date;       // APRTFCTR - Fecha transacción
    periodoDevengo?: Date | string | number[] | null; // APRTPRDV - Mes al que corresponde el aporte (Jackson: [aaaa,m,d]; a veces texto ISO)
    glosa: string;                // APRTGLSA - Glosa
    valor: number;                // APRTVLRR - Valor
    valorPagado: number;          // APRTVLPG - Valor pagado
    saldo: number;                // APRTSLDO - Saldo
    idAsoprep: number;     // APRTIDAS - ID Sistema ASOPREP
    fechaRegistro: Date;          // APRTFCRG - Fecha de registro
    usuarioRegistro: string;      // APRTUSRG - Usuario registro
    estado: number;             // APRTIDST - ID Estado
}
