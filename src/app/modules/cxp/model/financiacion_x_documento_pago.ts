import { DocumentoPago } from "./documento_pago";

export interface FinanciacionXDocumentoPago{
    codigo: number;
    documentoPago: DocumentoPago;
    tipoFinanciacion: number;
    aplicaInteres: number;
    porcentajeInteres: number;
    factorInteres: number;
    aplicaCuotaInicial: number;
    valorPorcentaCI: number;
    valorFijoCI: number;
    tipoCuotaInicial: number;
    valorInicialCI: number;
    valorTotalCI: number;
    numeroPagos: number;
    tipoPagos: number;
    rubroPeriodicidadP: number;
    rubroPeriodicidadH: number;
    tipoPeriodicidadPago: number;
    dependeOtraFinanciacion: number;
    numeroDocumentoDepende: String;
    idDepende: number;
    

}