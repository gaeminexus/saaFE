import { FinanciacionXDocumentoPago } from "./financiacion_x_documento_pago";

export interface PagosArbitrariosXFinanciacionPago{
    codigo: number;
    financiacionXDocumentoPago: FinanciacionXDocumentoPago;
    diaPago: number;
    mesPago: number;
    anioPago: number;
    fechaPago: Date;
    valor: number;
    
}