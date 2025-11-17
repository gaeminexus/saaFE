import { Asiento } from "../../cnt/model/asiento";
import { Chequera } from "./chequera";
import { Persona } from "./persona";


export interface Cheque {
    codigo: number;
    chequera: Chequera;
    numero: number;
    egreso: number;
    fechaUso: string;           // o Date, según cómo manejes las fechas en el frontend
    fechaCaduca: string;        // o Date
    fechaAnulacion: string;     // o Date
    rubroEstadoChequeP: number;
    rubroEstadoChequeH: number;
    fechaImpresion: string;     // o Date
    fechaEntrega: string;       // o Date
    asiento: Asiento;
    persona: Persona;
    valor: number;
    rubroMotivoAnulacionP: number;
    rubroMotivoAnulacionH: number;
    beneficiario: string;
    idBeneficiario: Persona;
}
