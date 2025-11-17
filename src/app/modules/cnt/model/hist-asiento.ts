import { Empresa } from "../../../shared/model/empresa";
import { TipoAsiento } from "./tipo-asiento";

export interface HistAsiento {
    codigo: number;
    empresa: Empresa;
    tipoAsiento: TipoAsiento;
    fechaAsiento: Date;
    numero: number;
    estado: number;
    observaciones: string;
    nombreUsuario: string;
    idReversion: number;
    numeroMes: number;
    numeroAnio: number;
    moneda: number;
    histMayorizacion: number;
    rubroModuloClienteP: number;
    rubroModuloClienteH: number;
    fechaIngreso: Date;
    rubroModuloSistemaP: number;
    rubroModuloSistemaH: number;
    idAsientoOriginal: number;
}
