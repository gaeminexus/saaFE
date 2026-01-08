import { FinanciacionXDocumentoPago } from "./financiacion_x_documento_pago";

export interface ComposicionCuotaInicialPago{
    codigo:number;
    resumenValorDocumentoPago: ComposicionCuotaInicialPago;
    valor: number;
    valorResumen: number;
    financiacionXDocumentoPago: FinanciacionXDocumentoPago;


}