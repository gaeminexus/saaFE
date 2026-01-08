import { DocumentoPago } from "./documento_pago";

export interface ValorImpuestoDocumentoPago{
    codigo: number;
    documentoPago: DocumentoPago;
    nombre: String;
    porcentaje: number;
    codigoAlternoValor: number;
    valorBase: number;
    valor: number;
    
}