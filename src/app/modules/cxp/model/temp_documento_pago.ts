import { Empresa } from "../../../shared/model/empresa";
import { Asiento } from "../../cnt/model/asiento";
import { Periodo } from "../../cnt/model/periodo";
import { Persona } from "../../tsr/model/persona";

export interface TempDocumentoPago{
    codigo: number;
    empresa: Empresa;
    persona: Persona;
    fechaDocumento: Date;
    razonSocial: String;
    ruc: String;
    direccion: String;
    diasVencimiento: number;
    fechaVencimiento: Date;
    numeroSerie: String;
    numeroDocumentoString: String;
    periodo: Periodo;
    mes: number;
    anio: number;
    numeroAutorizacion: number;
    fechaAutorizacion: Date;
    numeroResolucion: String;
    total: number;
    abono: number;
    saldo: number;
    asiento: Asiento;
    idFisico: number;
    tipoFormaPago: number;
    numeroDocumentoNumber: number;
    rubroEstadoP: number;
    rubroEstadoH: number;
    

}