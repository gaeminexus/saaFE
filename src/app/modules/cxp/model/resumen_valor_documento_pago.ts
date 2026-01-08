import { DocumentoPago } from "./documento_pago";

export interface ResumenValorDocumentoPago{
    codigo: number;
    documentoPago: DocumentoPago;
    codigoAlternoTipoValor: number;
    valor: number;
    
}