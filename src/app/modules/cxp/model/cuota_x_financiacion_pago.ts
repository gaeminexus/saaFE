import { FinanciacionXDocumentoPago } from "./financiacion_x_documento_pago";

export interface CuotaXFinanciacionPago{
    codigo: number;
    financiacionXDocumentoPago: FinanciacionXDocumentoPago;
    fechaIngreso: Date;
    fechaVencimiento: Date;
    tipo: number;
    valor: number;
    numeroSecuencial: number;
    numeroCuotaLetra: number;
    numeroTotalCuotas: number;
    totalAbono: number; 
    saldo: number;
    

}