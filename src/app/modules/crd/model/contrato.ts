import { Entidad } from "./entidad";
import { Filial } from "./filial";
import { TipoContrato } from "./tipo-contrato";

export interface Contrato {
    codigo: number;                   // CNTRCDGO - Código
    filial: Filial;             // FLLLCDGO - FK Filial
    tipoContrato: TipoContrato;       // TPCNCDGO - FK Tipo Contrato
    entidad: Entidad;            // ENTDCDGO - ID Entidad
    fechaInicio: Date;                // CNTRFCIN - Fecha inicio
    porcentajeAporteIndividual: number;  // CNTRPRAI - % Aporte Individual
    porcentajeAporteJubilacion: number;  // CNTRPRAJ - % Aporte Jubilación
    montoAporteAdicional: number;        // CNTRMNAA - Monto Aporte Adicional
    fechaTerminacion: Date;              // CNTRFCTR - Fecha de terminación
    motivoTerminacion: string;           // CNTRMTTR - Motivo terminación
    observacion: string;                 // CNTROBSR - Observación
    estado: number;                      // CNTRESTD - Estado
    fechaAprobacion: Date;               // CNTRFCAP - Fecha de aprobación
    usuarioAprobacion: string;           // CNTRUSAP - Usuario aprobación
    fechaReporte: Date;                  // CNTRFCRP - Fecha de reporte
    fechaRegistro: Date;                 // CNTRFCRG - Fecha de registro
    usuarioRegistro: string;             // CNTRUSRG - Usuario registro
    idEstado: number;                    // CNTRIDST - ID Estado
}
